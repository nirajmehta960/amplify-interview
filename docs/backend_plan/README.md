# Backend — How It's Built

The Amplify Interview API is a **FastAPI** service that turns a résumé and a job description into an adaptive AI interview, scores every answer, and produces structured feedback.

This folder documents *how it is actually implemented*, in the order you would build it. Every phase names the real files, the patterns used, and what you need to understand to write that layer yourself.

> **Honest documentation.** These docs describe the code as it is, including dead code, stubs, and one live bug. Where something is unfinished, it says so. That is more useful than a tidy fiction.

---

## Tech stack you need to know

| Layer | Technology | Why it's here |
|---|---|---|
| **Language** | Python 3.12 | Async-first; the Dockerfile pins 3.12 |
| **Web framework** | FastAPI ≥0.115 | Async, dependency injection, automatic OpenAPI |
| **Server** | Uvicorn ≥0.34 | ASGI server |
| **Validation** | Pydantic v2 ≥2.11 | Request/response contracts **and** LLM output schemas |
| **Config** | pydantic-settings ≥2.9 | Typed env vars with validators |
| **AI** | OpenAI SDK ≥1.50 (`AsyncOpenAI`) | GPT-4o / GPT-4o-mini; OpenRouter-compatible |
| **Auth** | python-jose[cryptography] | RS256 JWT verification against Cognito JWKS |
| **AWS** | boto3 | S3 (files), Transcribe (speech), DynamoDB (current DB) |
| **Parsing** | PyPDF2, python-docx | Résumé text extraction |
| **Rate limiting** | slowapi | IP-based throttling |
| **Email** | Resend | Welcome emails |
| **HTTP** | httpx | JWKS fetching |
| **Testing** | pytest, pytest-asyncio | (No tests exist yet — see Phase 10) |

**Concepts you must be comfortable with:** Python `async`/`await`, ASGI, dependency injection, JWT/asymmetric signatures, prompt engineering, JSON Schema, and enough SQL/NoSQL modelling to follow the persistence layer.

---

## Architecture

```
                       ┌──────────────────────────────────────┐
  HTTP request ──────▶ │ main.py                              │
                       │  CORS → rate limit → global handler  │
                       └──────────────┬───────────────────────┘
                                      ▼
                       ┌──────────────────────────────────────┐
                       │ middleware/auth.py                   │
                       │  Cognito JWT ← JWKS (cached 1h)      │
                       │  → CurrentUser (user.uid = tenant)   │
                       └──────────────┬───────────────────────┘
                                      ▼
   routers/  resume · interview · feedback · analytics · questions · user · email · speech
                                      │  thin: validate, call service, shape response
                                      ▼
   services/ interview_engine · question_generator · followup_handler · feedback_generator
             resume_parser · jd_parser · matching_engine · openai_client
                                      │
                     ┌────────────────┼────────────────┐
                     ▼                ▼                ▼
              prompts/*.py      db/dynamodb.py    db/storage.py
              (message         (persistence)      (S3 files)
               builders)              │                │
                     │                ▼                ▼
                     └────────▶  OpenAI API      AWS S3 / Transcribe
```

**The layering rule:** routers never call OpenAI or build prompts. Services never touch HTTP. Prompts are pure functions returning message lists. Follow that and the code stays testable.

---

## The phases

| # | Phase | What you learn |
|---|---|---|
| 1 | [Foundations](PHASE_01_foundations.md) | Project layout, FastAPI app, pydantic-settings, lifespan |
| 2 | [Data contracts](PHASE_02_data_contracts.md) | Pydantic v2 models, enums, validation, model composition |
| 3 | [Authentication](PHASE_03_auth.md) | Cognito JWT, JWKS caching, the `CurrentUser` dependency |
| 4 | [Persistence & storage](PHASE_04_persistence.md) | DB abstraction, multi-tenancy, S3 uploads, presigned URLs |
| 5 | [LLM integration](PHASE_05_llm_layer.md) | Async OpenAI wrapper, structured output, token/cost tracking |
| 6 | [Prompt engineering](PHASE_06_prompts.md) | Message builders, scoring rubrics, context injection, truncation |
| 7 | [Parsing & matching](PHASE_07_parsing_matching.md) | PDF/DOCX → text → structured data; résumé↔JD gap analysis |
| 8 | [The interview engine](PHASE_08_interview_engine.md) | The adaptive state machine — the heart of the product |
| 9 | [Feedback & analytics](PHASE_09_feedback_analytics.md) | Session aggregation, hybrid LLM+local scoring, speech-to-text |
| 10 | [Production hardening](PHASE_10_hardening.md) | Rate limiting, error handling, Docker, testing, known issues |

Phases 1–4 are infrastructure. **Phases 5–8 are where the product actually lives** — if you only read four, read those.

---

## Running it locally

```bash
cd backend
python3.12 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python -m uvicorn app.main:app --reload --port 4000
```

Minimum `backend/.env` (not committed — you must create it):
```bash
ENVIRONMENT=development
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000
AWS_REGION=us-east-1
AWS_S3_BUCKET=amplify-interview-uploads
AWS_DYNAMODB_TABLE_PREFIX=amplify_
OPENAI_API_KEY=sk-...
```

With `DEBUG=true`, interactive docs are at `http://localhost:4000/docs`. With `ENVIRONMENT=development`, the literal token `mock-user-token` authenticates as a stub user — that is how you test protected routes without Cognito.

> ⚠️ `db/dynamodb.py` and `db/storage.py` **auto-create real AWS tables and buckets** on first use if credentials are present. Hitting data endpoints locally touches your real AWS account.

---

## Current state — what's real, what isn't

**Fully working:** résumé/JD parsing, match analysis, the adaptive interview loop, feedback generation, analytics aggregation, Cognito auth, S3 storage, AWS Transcribe.

**Known issues** (detailed in the phases that own them):

| Issue | Where | Phase |
|---|---|---|
| **Live bug:** résumé upload and JD create return 500 — `resume_data["created_at"]` is a key that is never set | `routers/resume.py:85`, `:174` | 4 |
| `chat_completion_stream()` is fully implemented and never called | `services/openai_client.py:211` | 5 |
| Feedback hardcodes `"gpt-4o"` instead of `settings.openai_model_advanced` | `services/feedback_generator.py` | 9 |
| Rate limiter is `memory://` and has no per-route decorators | `middleware/rate_limit.py` | 10 |
| Speech transcription blocks the request up to 60s | `routers/speech.py` | 9 |
| `resume_context` for follow-ups is a hardcoded stub | `services/interview_engine.py:256` | 8 |
| Zero test files exist, though pytest is a dependency | — | 10 |

**In progress:** the backend runs on DynamoDB but is being migrated to PostgreSQL — see [`../deployment_plan/PHASE_05_code_migration.md`](../deployment_plan/PHASE_05_code_migration.md).

---

## Related docs

- [`../deployment_plan/`](../deployment_plan/README.md) — deploying this to AWS
- [`../frontend_plan/`](../frontend_plan/README.md) — how the React client is built
- [`../CLOUD_LEARNING_OBJECTIVES.md`](../CLOUD_LEARNING_OBJECTIVES.md) — the infrastructure concepts

**Start:** [Phase 1 — Foundations](PHASE_01_foundations.md)
