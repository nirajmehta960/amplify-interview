# Backend Phase 9 — Feedback, Analytics, and Speech

**What this covers:** turning a finished session into structured feedback, aggregating across sessions, and speech-to-text.
**Files:** `backend/app/services/feedback_generator.py`, `backend/app/routers/{feedback,analytics,speech}.py`
**You need to know:** Phases 5–8, AWS Transcribe

---

## Feedback generation

When a session completes, `generate_session_feedback(user_id, session_id)` reasons over the **entire transcript at once**:

```
load session
load up to 200 messages, ordered timestamp ASCENDING
optionally load the résumé + JD documents for context
flatten messages → [{role, content, analysis}]
build_session_feedback_prompt(...)
chat_completion_json(model="gpt-4o", temperature=0.3, max_tokens=3000)
merge LLM output with locally computed values
persist onto the session as `summary`
```

**This is the one call that uses `gpt-4o`** rather than mini. It reasons across ten questions and their analyses simultaneously — the task where the stronger model earns its cost. It also runs exactly once per session, so the cost difference is negligible.

Message order is `ASCENDING` here, unlike list endpoints which are `DESCENDING`. A transcript read backwards would produce nonsense feedback.

---

## Hybrid scoring: trust the LLM, verify with arithmetic

The most instructive pattern in this file. Some values come from the model, some are computed locally, and some use the model's value **with a computed fallback**:

```python
# LLM value, local fallback
score_distribution = ScoreDistribution(
    excellent=data.get("score_distribution", {}).get("excellent",
              sum(1 for s in scores if s >= 80)),
    good=...,
    needs_work=...,
)

# Purely local — never asked of the model
difficulty_progression = [
    DifficultyProgression(
        question_number=i + 1,
        difficulty=questions_generated[i].get("difficulty", "medium"),
        score=score,
    )
    for i, score in enumerate(session["scores"])
]

average_time_per_question = total_duration_seconds / max(len(scores), 1)
```

The rule: **anything derivable by arithmetic should be computed, not generated.** Counting how many scores exceed 80 is a `sum()`, and asking a language model to count is asking for an error. Reserve the model for genuine judgement — strengths, improvements, readiness assessment, narrative feedback.

`max(len(scores), 1)` is the division-by-zero guard for a session with no answers.

Lists are capped at `[:5]` and every field goes through the same defensive `.get(..., default)` reconstruction as Phase 8. `_clamp` reappears here — a near-duplicate of the one in `followup_handler.py`, differing only in defaults and returning `50` rather than `min_val` for unparseable input. **Two copies of the same helper is real duplication worth consolidating.**

---

## Per-question feedback is derived, not stored

`GET /api/feedback/session/{id}/questions` returns a `QuestionFeedback` list, but **nothing persists that shape**. The router reconstructs it on the fly by walking the messages and pairing each interviewer message with the candidate message that follows:

```python
for i, msg in enumerate(messages):
    if msg["role"] == "interviewer" and i + 1 < len(messages):
        nxt = messages[i + 1]
        if nxt["role"] == "candidate" and nxt.get("analysis"):
            ...build QuestionFeedback from the pair...
```

This is effectively a self-join over the transcript done in Python. It is the right call — the data is already there in `messages.analysis`, and duplicating it into a second table would create a consistency problem for no gain.

---

## Analytics

Three read-only endpoints over the session list:

| Endpoint | Returns |
|---|---|
| `/api/analytics/overview` | totals, averages, best/worst, readiness + mode distributions, top strengths/improvements |
| `/api/analytics/progress` | score and communication timelines |
| `/api/analytics/skills` | skill gaps addressed vs. remaining, diffed against the latest résumé |

All aggregation is currently **Python loops over fetched rows** — averages, frequency counts, top-N tallies. That is a direct consequence of the DynamoDB document model, and it is the clearest argument for the Postgres migration: `/overview` becomes a single query with `COUNT`, `AVG`, `SUM`, and `GROUP BY`, and the top-strengths tally (the only genuinely O(n·m) loop in the codebase) becomes six lines of SQL using `jsonb_array_elements_text`.

`/skills` fetches the latest résumé **and** recent sessions and diffs them in application code — a manual join that Postgres would do natively.

Everything reads `session["summary"]`, the embedded feedback blob. Moving feedback to its own table (migration Phase 5) touches all three endpoints.

---

## Speech-to-text

`POST /api/speech/transcribe` wraps AWS Transcribe:

```
receive audio → upload to s3://bucket/transcribe_temp/{job_id}.webm
start_transcription_job(LanguageCode=settings.aws_transcribe_language)
poll every 0.5s, up to 60s
fetch the result JSON, extract the transcript
finally: delete the S3 object and the Transcribe job
```

Three things to know:

**`settings.aws_transcribe_language` is the Transcribe language code.** (Renamed from `gcp_speech_language` on 2026-08-10; the old name was a GCP-era misnomer for a live setting.)

**The cleanup lives in a `finally` block**, so temp audio is removed even on failure. The S3 lifecycle rule on `transcribe_temp/` (deployment plan, Phase 3) is the backstop for when the process dies before `finally` runs.

**This endpoint has no `CurrentUser` dependency — it is unauthenticated.** Deliberate or not, it means anyone can spend your Transcribe budget. Worth fixing.

### The blocking-poll problem

Polling for up to 60 seconds **inside the request handler** holds an ASGI worker the entire time. Consequences:

- Concurrency collapses — a handful of simultaneous transcriptions saturate the worker pool.
- If the client disconnects, the job is orphaned with no way to recover the result.
- It collides with Nginx's default 60s `proxy_read_timeout`, producing intermittent 504s (which is why the deployment plan raises it to 90s).

The real fix is SQS + a worker: accept the audio, enqueue, return a job ID, let the client poll a cheap status endpoint. That is Stage 2 in the deployment plan.

---

## 🧠 Check your understanding

1. Why is feedback the only call that uses `gpt-4o`?
2. Why ASCENDING message order here but DESCENDING elsewhere?
3. What is the rule for choosing between an LLM value and a computed one?
4. Why is `score_distribution` computed locally as a fallback rather than simply trusted?
5. Why is `QuestionFeedback` derived per request instead of stored?
6. Why does the analytics layer make the strongest case for Postgres?
7. What are the three distinct failure modes of the blocking transcription poll?

---

## ⚠️ Known issues

| Issue | Detail |
|---|---|
| Hardcoded model | `feedback_generator.py` passes the literal `"gpt-4o"` instead of `settings.openai_model_advanced`, so the config field is silently ignored |
| Duplicated helper | `_clamp` exists in both `followup_handler.py` and `feedback_generator.py` with slightly different behaviour |
| Unauthenticated endpoint | `/api/speech/transcribe` has no `CurrentUser` |
| Blocking poll | Up to 60s per request, holding a worker |
| Dead field | `total_duration_seconds` is read from the session but nothing ever writes it — always 0 |

---

**Next:** [Phase 10 — Production hardening](PHASE_10_hardening.md)
