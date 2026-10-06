# Backend Phase 2 — Data Contracts with Pydantic

**What this covers:** the models that define both the HTTP API *and* the schemas the LLM must return.
**Files:** `backend/app/models/{resume,interview,feedback,question}.py`
**You need to know:** Pydantic v2, Python enums, JSON Schema, type hints

---

## The central idea

Most projects use Pydantic for request/response validation. This one does that **and** uses the same models as **LLM output schemas** — `ParsedResume`, `ParsedJobDescription`, and `MatchAnalysis` are each passed to `chat_completion_structured()`, which converts them to JSON Schema, injects that into the prompt, and validates the model's reply against it (Phase 5).

That dual role is the design decision to understand. One definition gives you: request validation, response serialization, OpenAPI docs, the LLM's output contract, and runtime validation of what the LLM returned. Change a field once and all five stay in sync.

---

## Enums

Always `(str, Enum)`, never bare `Enum`:

```python
class InterviewMode(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL  = "technical"
    MIXED      = "mixed"

class DifficultyLevel(str, Enum):
    EASY = "easy"; MEDIUM = "medium"; HARD = "hard"
```

Subclassing `str` means the value serializes as `"behavioral"` rather than `InterviewMode.BEHAVIORAL`, works directly in JSON and DB writes, and compares equal to the plain string. FastAPI also renders it as an enum in OpenAPI, so the docs show the valid values.

Enums live with their primary domain and get imported, not redefined — `models/question.py` imports `DifficultyLevel` from `interview.py`. Duplicating an enum across modules is how the two copies drift.

`DifficultyLevel` has an ordering dependency worth knowing: `interview_engine._next_difficulty` does `order.index(current)` on `[EASY, MEDIUM, HARD]` to step up or down. The enum's declaration order is load-bearing.

---

## Validation is declarative

There are **zero `@field_validator`s** in the models — all validation is `Field(...)` constraints. Three patterns:

```python
# 1. Bounded scores — every score in the system is 0-100
overall_score: int = Field(ge=0, le=100)

# 2. Bounded config with defaults
question_count:   int = Field(default=10, ge=3,  le=20)
duration_minutes: int = Field(default=30, ge=10, le=90)

# 3. Input guards on free text
content:  str = Field(..., min_length=1, max_length=10000)
raw_text: str = Field(..., max_length=10000)
```

The `ge=0, le=100` bounds do real work here: they constrain **LLM output**, not just user input. When a model returns `score: 150`, validation catches it. (The services *additionally* defend with a `_clamp()` helper — see Phase 8 — because a hard validation failure mid-interview is worse than a clamped score.)

The `max_length` guards are cost control as much as safety: unbounded text goes into a prompt, and prompts are billed per token.

### Always `default_factory` for mutable defaults

```python
strengths: List[str] = Field(default_factory=list)     # correct
strengths: List[str] = []                              # shared-mutable-state bug
```

Every list in every model uses `default_factory=list`. This is a general Python rule, but it bites hardest in long-lived model classes.

---

## Composition

Models nest up to three levels:

```
ParsedResume
 ├── List[WorkExperience]     (company, title, dates, bullets[], technologies[])
 ├── List[Education]
 ├── List[Project]
 └── List[Certification]

ChatMessage
 ├── QuestionMetadata?        (set on interviewer messages)
 └── ResponseAnalysis?        (set on candidate messages)
```

`ChatMessage` is worth studying: **one message type, role-discriminated payloads**. Rather than separate `InterviewerMessage` and `CandidateMessage` classes, there is a `role: MessageRole` plus two optional payloads, only one of which is populated. This keeps the transcript a single homogeneous list — much simpler to store, order, and render.

### Forward references

```python
class SendMessageResponse(BaseModel):
    candidate_message:   ChatMessage
    interviewer_message: ChatMessage
    session_progress:    "SessionProgress"    # defined below

SendMessageResponse.model_rebuild()           # required at module end
```

When a model references a class defined later in the file, quote the name and call `model_rebuild()` once the target exists. Skip the rebuild and you get `PydanticUndefinedAnnotation` at first use — not at import, which makes it confusing to trace.

---

## Wrapper models vs domain models

There are two distinct families, and mixing them up causes churn:

**Domain models** describe the thing itself — `ParsedResume`, `MatchAnalysis`, `ResponseAnalysis`. These double as LLM schemas.

**Wrapper models** exist purely for HTTP — `ResumeUploadResponse`, `ResumeListItem`, `SessionListItem`, `StartSessionResponse`. They add IDs, timestamps, and flattened summary fields.

```python
class ResumeListItem(BaseModel):          # list view — small, flat
    resume_id: str
    file_name: str
    full_name: str                        # lifted out of parsed_data
    uploaded_at: str
    total_years_experience: Optional[float]
    top_skills: List[str]                 # first 5 only

class ResumeUploadResponse(BaseModel):    # detail view — full nested object
    resume_id: str
    file_name: str
    parsed_data: ParsedResume
    uploaded_at: str
```

A list endpoint returning 20 fully-parsed résumés would be a huge payload the UI never uses. The list item lifts out the four fields the card actually renders.

---

## Derived fields are not stored

Several response fields are **computed per request**, not persisted:

| Field | Computed from |
|---|---|
| `SessionResponse.total_messages` | `COUNT` of messages |
| `SessionListItem.overall_score` | the session's feedback record |
| `SessionProgress.average_score` | `sum(scores) / len(scores)` |
| `SessionProgress.topics_covered` | `list(set(topics))` |

Recognizing which fields are derived matters enormously for the Postgres migration — persisting `total_messages` as a column would immediately drift from reality.

---

## Timestamps are `str`, not `datetime`

Every timestamp field in every response model is typed **`str`**, holding an ISO-8601 string.

This is a consequence of the DynamoDB era, where timestamps were stored as ISO strings. It is also a **contract the frontend depends on**, and it becomes a real hazard during the Postgres migration: Pydantic v2 does **not** coerce a `datetime` into a `str` field — it raises, which surfaces as a 500. Every repository function must call `.isoformat()` on the way out.

---

## 🧠 Check your understanding

1. Why `(str, Enum)` rather than plain `Enum`?
2. How can one model serve as both an HTTP response schema and an LLM output schema?
3. Why does `ChatMessage` carry two optional payloads instead of being split into two classes?
4. When is `model_rebuild()` required, and what breaks without it?
5. Why does `ResumeListItem` exist when `ResumeUploadResponse` already describes a résumé?
6. Why is `Field(ge=0, le=100)` insufficient on its own for LLM-returned scores?

---

## ⚠️ Notes

`models/question.py` defines **`QuestionBankItem`, which has zero usages anywhere** — planned-but-unbuilt code.

Do not confuse the two "question" concepts:
- **`GeneratedQuestion`** (`models/question.py`) — an AI-generated interview question, stored inside a session.
- **`QuestionResponse`/`QuestionCreate`** (defined inline in `routers/questions.py`, *not* in `models/`) — a user's saved practice question.

Different domains, similar names. `routers/questions.py` does not import `models/question.py` at all.

---

**Next:** [Phase 3 — Authentication](PHASE_03_auth.md)
