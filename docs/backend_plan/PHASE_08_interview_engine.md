# Backend Phase 8 — The Adaptive Interview Engine

**What this covers:** the state machine that runs an interview, scores answers, decides follow-ups, and adapts difficulty. This is the product.
**Files:** `backend/app/services/{interview_engine,followup_handler,question_generator}.py`
**You need to know:** state machines, defensive parsing, everything from Phases 5–7

---

## What makes this "adaptive"

A static mock interview asks ten fixed questions. This one:

1. Generates questions **from your résumé and the specific job's gaps** (Phase 7)
2. **Scores every answer** across seven dimensions
3. **Raises or lowers difficulty** based on your recent performance
4. **Asks follow-ups** when an answer is vague or worth probing
5. **Generates new questions on the fly** if you outpace the pre-generated set

All state lives in the database, not in memory — so the interview survives a server restart, and scales horizontally.

---

## Session state

```python
session_data = {
    "user_id":                str,
    "config":                 dict,        # SessionConfig
    "status":                 str,         # in_progress | completed
    "resume_id" / "jd_id":    str | None,
    "match_analysis":         dict | None,
    "questions_generated":    list[dict],  # grows if generated on the fly
    "current_question_index": int,
    "current_difficulty":     str,
    "scores":                 list[int],   # one per answered question
    "topics_covered":         list[str],
    "total_tokens" / "total_cost_cents": int,
    "created_at" / "completed_at": str | None,
}
```

`scores` and `topics_covered` are **append-only lists** driving adaptation. `questions_generated` is mutable — it grows when the engine generates a question mid-interview.

---

## Difficulty adaptation

```python
DIFFICULTY_UP_THRESHOLD   = 78
DIFFICULTY_DOWN_THRESHOLD = 45
DIFFICULTY_WINDOW         = 3

def _next_difficulty(current: DifficultyLevel, recent_scores: List[int]) -> DifficultyLevel:
    if len(recent_scores) < 2:
        return current                      # not enough signal yet

    window = recent_scores[-DIFFICULTY_WINDOW:]
    avg = sum(window) / len(window)

    order = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD]
    idx = order.index(current)

    if   avg >= DIFFICULTY_UP_THRESHOLD   and idx < len(order) - 1:  return order[idx + 1]
    elif avg <= DIFFICULTY_DOWN_THRESHOLD and idx > 0:               return order[idx - 1]
    return current
```

The design choices are all about **stability**:

- **A rolling 3-score window**, not the last score — one bad answer shouldn't tank the difficulty.
- **A wide dead zone (46–77)** where nothing changes. Narrow thresholds would oscillate every question.
- **`len < 2` returns early** — never adapt off a single data point.
- **Index clamping** at both ends, so `HARD` can't step past the end of the list.

Note the enum's declaration order is load-bearing here, since `order.index()` depends on it.

---

## Scoring an answer

`followup_handler.analyze_response()` produces a `ResponseAnalysis` with seven 0–100 scores (relevance, specificity, structure, depth, clarity, confidence, plus an overall `score`), strengths, improvements, and brief feedback.

The implementation detail that matters is that **it never trusts the model's shape**:

```python
analysis = ResponseAnalysis(
    score=_clamp(data.get("score", 50)),
    relevance=_clamp(data.get("relevance", 50)),
    ...
    strengths=data.get("strengths", [])[:3],
    improvements=data.get("improvements", [])[:3],
)
```

Field-by-field reconstruction with `.get(..., default)` and clamping — not `ResponseAnalysis(**data)`. A missing key or an out-of-range value would otherwise raise mid-interview and lose the user's answer.

`_clamp` handles three real failure modes:

```python
def _clamp(value, min_val=0, max_val=100) -> int:
    try:
        value = float(value)              # 1. model returned "85" as a string
    except (TypeError, ValueError):
        return 50
    if 0 <= value <= 10 and max_val == 100:
        value *= 10                       # 2. model scored out of 10 despite the prompt
    return max(min_val, min(max_val, round(value)))   # 3. out of range
```

The 0–10 rescale is the interesting one: models frequently ignore "score 0-100" and return 8. Rescaling is a judgement call — a genuine score of 8/100 becomes 80 — but a legitimately terrible answer scoring under 10 is rare enough that this trades correctly.

---

## The turn state machine

Each `POST /session/{id}/message` runs `process_response()`:

```
load session
  └─ reject unless status == IN_PROGRESS
rehydrate SessionConfig + GeneratedQuestion[] from stored dicts
analyze_response(current_question, answer)          ← LLM call 1
persist candidate message
append score + category

├── is_complete?  (current_idx + 1) >= config.question_count
│     └─ emit SYSTEM wrap-up message, status = COMPLETED
│
├── enable_followups?  decide_followup(...)         ← LLM call 2
│     └─ yes → interviewer message with is_followup=True
│              SAME question_number, SAME difficulty, index does NOT advance
│
└── otherwise
      ├─ adapt difficulty via _next_difficulty(scores)
      ├─ advance index
      ├─ if index >= len(questions):
      │     generate_single_question(topics_covered=...)   ← LLM call 3
      │     append to questions_generated
      └─ emit the next question

persist session state (one update)
persist interviewer message
return (candidate_msg, interviewer_msg, progress, merged_usage)
```

**The follow-up branch not advancing the index is the key subtlety.** A follow-up drills into the *same* question, so `current_question_index` stays put and `question_number` is unchanged. Advancing it would skip a question and silently shorten the interview.

**1–3 LLM calls per turn**, merged by `_merge_usage()` so per-session cost is exact.

---

## Follow-up decisions

```python
class FollowupDecision(BaseModel):
    should_followup: bool
    reason: str
    followup_question: Optional[str]
    followup_type: Optional[str]     # clarify | deepen | verify | pivot
```

The four types encode different intents — `clarify` for vagueness, `deepen` for a good answer worth exploring, `verify` for an unsupported claim, `pivot` for going off-topic. Naming the intent makes the generated question far more targeted than a generic "tell me more".

Same defensive `.get()` construction as `analyze_response`.

---

## Question generation

`initialize_session` generates **all N questions upfront** in one call, which is cheaper and more coherent than one-at-a-time (the model can vary topics across the set deliberately).

If no résumé/JD is attached, it falls back to synthetic placeholders (`"Software Engineer"`, empty skills) so a session can still start.

`generate_questions` skips malformed items with a warning rather than failing the batch:

```python
for item in data.get("questions", []):
    try:
        questions.append(GeneratedQuestion(**item))
    except ValidationError as e:
        logger.warning(f"Skipping malformed question: {e}")
```

Nine good questions beat a hard failure.

**On-the-fly generation** happens when a user outpaces the set (possible because follow-ups don't consume questions). `generate_single_question` receives `topics_covered` so the new question avoids ground already covered.

---

## ⚠️ Known stubs in this file

Two places where the intent is clear but the implementation is a placeholder:

```python
# interview_engine.py ~256 — follow-up context is hardcoded
if session.get("match_analysis"):
    resume_context = {"recent_role": "Unknown", "technical_skills": []}
```
Real résumé context is available on the session but is not passed through, so follow-ups are less personalized than they could be.

```python
# interview_engine.py ~298 — on-the-fly generation passes the wrong things
resume_data = session.get("match_analysis", {})
next_q_gen, gen_usage = await generate_single_question(
    resume_data=resume_data, jd_data={}, match_analysis=resume_data, ...)
```
`match_analysis` is passed as both `resume_data` and `match_analysis`, and `jd_data` is empty. Questions generated mid-interview are noticeably more generic than the pre-generated batch.

Both are small fixes with real product impact.

---

## 🧠 Check your understanding

1. Why a 3-score rolling window instead of the most recent score?
2. Why is 46–77 a dead zone where difficulty doesn't move?
3. What breaks if the follow-up branch advances `current_question_index`?
4. Why reconstruct `ResponseAnalysis` field-by-field instead of `ResponseAnalysis(**data)`?
5. What three failure modes does `_clamp` handle, and what's the risk of the 0–10 rescale?
6. Why generate all questions upfront rather than one per turn?
7. How can a user outpace the pre-generated question set?
8. Why does all state live in the DB rather than memory?

---

**Next:** [Phase 9 — Feedback & analytics](PHASE_09_feedback_analytics.md)
