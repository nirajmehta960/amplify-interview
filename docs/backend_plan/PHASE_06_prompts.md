# Backend Phase 6 — Prompt Engineering

**What this covers:** how prompts are organized, templated, and kept token-bounded — the layer that actually determines output quality.
**Files:** `backend/app/prompts/{resume_extraction,jd_extraction,question_generation,followup,feedback}.py`
**You need to know:** LLM prompting, system vs user roles, token budgeting

---

## Prompts are code, and they live in their own package

Every prompt is a **pure function returning a message list**:

```python
def build_response_analysis_prompt(question, response, interview_type, question_category
                                   ) -> List[Dict[str, str]]:
    return [
        {"role": "system", "content": system_content},
        {"role": "user",   "content": user_content},
    ]
```

Uniformly two messages, system + user. Services never construct message dicts themselves — they call a builder and hand the result to `openai_client`.

Why this matters: prompts become **diffable, reviewable, and testable** like any other function. You can unit-test that a prompt contains the right context without calling an API. Inline prompt strings scattered through service code are effectively untrackable.

Two shapes, chosen by whether context varies:

- **Constant + thin builder** for context-free extraction — `RESUME_EXTRACTION_SYSTEM` is a long module-level string, and `build_resume_extraction_prompt(raw_text)` just wraps it with the user message.
- **Pure function** for anything context-dependent — question generation, follow-ups, analysis, feedback.

---

## The recurring techniques

### 1. Describe the JSON shape *in the prompt*, with semantics

Even when `chat_completion_structured` already injects the JSON Schema, the system prompt restates the shape with meaning attached:

```
"overall_score": number (0-100, weighted average of all question scores),
"readiness_level": string (one of: "not_ready", "needs_work", "almost_ready", "ready"),
"strengths": array of 3-5 strings (specific, evidence-based),
```

Redundant, and effective. JSON Schema conveys *types*; prose conveys *intent*. `"weighted average of all question scores"` is not expressible in a schema, and it is exactly what stops the model inventing an unrelated number.

### 2. Scoring rubrics — the highest-leverage technique here

```
SCORING GUIDE:
85-100: Interview-ready. Strong, specific, well-structured answers.
70-84:  Solid. Good content, some structure or specificity gaps.
55-69:  Developing. Relevant but vague or incomplete.
40-54:  Weak. Significant gaps in content or clarity.
0-39:   Poor. Off-topic, or fails to answer.
```

Without an explicit band table, "score this answer 0-100" produces numbers that are **not comparable across calls** — the same answer might score 72 or 85 on different runs. Since this app's entire adaptive-difficulty mechanism keys off score thresholds (78 up, 45 down), unstable scoring would make difficulty adaptation random.

These rubrics appear in `feedback.py`, `followup.py`, and `matching_engine.py`. **If you build anything that scores with an LLM, write the rubric.**

### 3. Dict-dispatched instruction blocks

```python
mode_instructions = {
    InterviewMode.BEHAVIORAL: "Focus on past experiences, STAR-format...",
    InterviewMode.TECHNICAL:  "Focus on technical depth, system design...",
    InterviewMode.MIXED:      "Balance behavioral and technical...",
}
instructions = mode_instructions[mode]

analysis_focus = {
    "behavioral": "...", "technical": "...", "situational": "...",
}
focus = analysis_focus.get(question_category, analysis_focus["behavioral"])
```

Enum or category → prompt paragraph. Note the `.get(..., default)` on the category version, since categories come back from the LLM and may not match the known set. Prompt-building must never `KeyError` on model output.

### 4. Conditional context sections

```python
resume_context = f"CANDIDATE BACKGROUND:\n{...}" if resume_data else ""
jd_context     = f"TARGET ROLE:\n{...}"          if jd_data     else ""
match_context  = f"IDENTIFIED GAPS:\n{...}"      if match       else ""

user_content = f"{resume_context}{jd_context}{match_context}\n\nTRANSCRIPT:\n{transcript}"
```

Each section is either a full block or an empty string. Concatenating handles all eight combinations with no branching. Critically, absent context produces **nothing** rather than `"None"` or `"[]"` — an empty section is invisible, while a literal `None` is noise the model will try to interpret.

### 5. Aggressive truncation everywhere

```python
technical_skills[:15]      required_skills[:10]      missing_skills[:5]
responsibilities[:8]       work_experience[:5]       description[:80]
```

Every injected list is capped. Prompts are billed per token and the useful signal is in the first few items. Private `_format_*` helpers do the rendering with `"None listed"` fallbacks so a prompt never contains an empty bracket.

### 6. Transcript flattening

`build_session_feedback_prompt` walks the message list, pairs each interviewer message with the candidate message that follows it, and emits:

```
Q1: <question>
A1: <answer>
Score: 78/100
---
Q2: ...
```

A raw JSON message array would work, but this is far more token-efficient and far easier for the model to reason over. **Shaping data for readability is prompt engineering.**

---

## Where prompts couple to each other

The most important structural detail in the whole backend:

```
matching_engine → MatchAnalysis {interview_focus_areas, missing_skills, strengths}
                        │
                        ▼
       build_question_generation_prompt(match_analysis=...)
                        │
                        ▼
              questions targeting the candidate's actual gaps
```

The match analysis output feeds directly into the question-generation prompt. **That single coupling is what makes the interview personalized** rather than a generic question bank. If you only understand one data flow in this codebase, make it this one.

---

## Model output is never trusted

Prompts request a shape; services verify it. Every consumer rebuilds the object field-by-field with defaults:

```python
analysis = ResponseAnalysis(
    score=_clamp(data.get("score", 50)),
    strengths=data.get("strengths", [])[:3],
    ...
)
```

Detailed in Phase 8, but it belongs to prompt engineering conceptually: **a prompt is a request, not a guarantee.** Design for the model ignoring part of your instructions.

---

## 🧠 Check your understanding

1. Why do prompts live in their own package as pure functions?
2. Why restate the JSON shape in prose when a schema is already injected?
3. What specifically breaks in this app if scores aren't calibrated by a rubric?
4. Why `.get(category, default)` rather than direct indexing?
5. Why is an empty string better than `"None"` for absent context?
6. Why flatten the transcript into `Q1:/A1:/Score:` instead of passing the message array?
7. Which prompt-to-prompt coupling makes the interview personalized?

---

## ⚠️ Note

Every file in `prompts/` has `from typing import ...` on **line 1, above the module docstring**. That silently demotes the docstring to a no-op string expression — `__doc__` is `None` for these modules. Harmless, but wrong, and easy to fix.

---

**Next:** [Phase 7 — Parsing & matching](PHASE_07_parsing_matching.md)
