# Backend Phase 10 — Production Hardening

**What this covers:** router conventions, rate limiting, error handling, containerization, testing — the work that separates "runs on my machine" from "runs in production".
**Files:** `backend/app/routers/*.py`, `backend/app/middleware/rate_limit.py`, `backend/Dockerfile`
**You need to know:** HTTP semantics, Docker, pytest

---

## Router conventions

Every router follows the same shape, which is what makes eight of them readable:

```python
router = APIRouter(prefix="/api/interview", tags=["Interview"])
logger = logging.getLogger(__name__)

@router.post("/session", response_model=StartSessionResponse,
             status_code=status.HTTP_201_CREATED)
async def create_session(user: CurrentUser, config: SessionConfig):
    ...
```

- **`user: CurrentUser` is always the first parameter.** Consistent, and its absence makes a public endpoint obvious.
- **Explicit `response_model=`** on everything — it validates the response, strips unexpected fields, and generates the OpenAPI schema.
- **Correct status codes:** `201` on create, `204` on delete (returning nothing).
- **`tags=[...]`** groups endpoints in `/docs`.

### The error-handling shape

```python
doc = await db.get_document(ref)
if not doc:
    raise HTTPException(404, "Session not found")     # guards first, outside try

try:
    result = await some_service.do_work(...)
except ValueError as e:
    raise HTTPException(400, str(e))                  # user-fixable
except Exception as e:
    logger.error(f"Operation failed: {e}")
    raise HTTPException(500, "Something went wrong")  # generic to client
```

**Services raise `ValueError` for user-fixable problems**, and the router turns that into a 400 with the message passed through. Everything else becomes a logged 500 with a generic message. This is what lets services stay HTTP-free while still distinguishing "your input was bad" from "we broke".

Best-effort work is wrapped separately and downgraded to a warning rather than failing the request:

```python
try:
    match_analysis = await matching_engine.analyze_match(resume, jd)
except Exception as e:
    logger.warning(f"Match analysis failed, continuing without it: {e}")
    match_analysis = None
```

Deciding which failures are fatal and which are degradable is a design decision worth making explicitly.

> ⚠️ **The cost of a broad `except Exception`:** in `routers/resume.py` it converts a trivial `KeyError` (Phase 4) into an opaque 500, hiding a live bug. Broad handlers make services resilient and bugs invisible — log with `exc_info=True` so the traceback survives.

### Route ordering

`@router.get("/{resume_id}")` is declared **before** `/jd/list` in the same router. Starlette matches in declaration order, and a path parameter will happily swallow a literal segment. Register static segments first — this is a classic source of "why does `/jd/list` return 404".

---

## Rate limiting

```python
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
    storage_uri="memory://",
)
```

Wired in `main.py` with `app.state.limiter = limiter` plus the `RateLimitExceeded` handler.

**Two significant limitations:**

1. **`memory://` storage is per-process.** With 4 uvicorn workers, the effective limit is 4× the configured value, and it resets on every deploy. Multi-instance deployments make it meaningless. Redis is the fix.
2. **No `@limiter.limit(...)` decorators exist on any route.** Only the global default applies, so the expensive endpoints (`/session/{id}/message`, which makes up to 3 LLM calls, and `/speech/transcribe`) get the same allowance as `/health`.

Rate limiting by cost rather than by count is the improvement worth making.

---

## The Dockerfile

```dockerfile
FROM python:3.12-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends build-essential
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim
COPY --from=builder /install /usr/local
COPY app/ app/
ENV PORT=8080
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1 ...
```

**Multi-stage:** compilers live in the builder and never ship. The runtime image is smaller and has less attack surface.

**Layer order:** `requirements.txt` is copied and installed *before* `COPY app/`, so editing source code doesn't reinstall dependencies. This is the single most impactful Dockerfile habit.

**`--workers 1`** is correct here — you scale by running more containers, not more processes inside one. It also sidesteps the per-process rate-limit problem above.

One thing to watch: the Python version must stay in sync with your local venv and CI (see the deployment plan, Phase 7).

---

## Testing — the gap

`pytest`, `pytest-asyncio`, and `pytest-cov` are all dependencies. **There are zero test files.**

This is not merely untested code — it actively blocks CI. `pytest` with no tests collected exits with **code 5**, which fails the job. Since the planned pipeline gates deployment on `needs: test`, nothing would ever deploy.

The minimum useful suite:

```
backend/pytest.ini          # asyncio_mode = auto   ← without this, async tests are
backend/tests/conftest.py   #   silently skipped and pytest still exits 0
backend/tests/unit/         # _next_difficulty, _clamp, calculate_cost — no I/O
backend/tests/integration/  # routers against a real DB, with OpenAI mocked
```

Priorities, in order:

1. **Pure functions first** — `_next_difficulty` (all five branches), `_clamp` (string input, 0–10 rescale, out of range), `calculate_cost`. No mocking required and they encode real business rules.
2. **Always mock OpenAI.** Patch at the service seam (`question_generator.generate_questions`, `followup_handler.analyze_response`). Real calls are slow, costly, and non-deterministic. Add an autouse fixture that raises if `get_openai_client` is ever reached, so a live call can't leak in.
3. **Auth override** via `app.dependency_overrides[get_current_user]`, plus one real test that a tampered token returns 401.
4. **The riskiest paths:** session state round-tripping, cascade deletes, and cross-tenant access returning 404.

Use `httpx.AsyncClient(transport=ASGITransport(app=app))`, not `TestClient` — the latter fires the lifespan and attempts a real startup DB connection.

---

## Operational surface

`/health` returns status, version, and environment — this is what the deployment health check curls. `/` returns an endpoint index, genuinely useful when `/docs` is disabled in production.

Logging is configured once in `main.py` with `%(asctime)s [%(levelname)s] %(name)s: %(message)s`, and every module uses `logging.getLogger(__name__)` so log lines identify their source. The `[ERROR]` token is what the CloudWatch metric filter matches on (deployment plan, Phase 11) — changing the format breaks the alarm.

---

## 🧠 Check your understanding

1. How do services signal a user error without importing HTTP?
2. Why is a broad `except Exception` in a router both useful and dangerous?
3. Why must `/jd/list` be registered before `/{resume_id}`?
4. What is wrong with `memory://` rate-limit storage under multiple workers?
5. Why copy `requirements.txt` before the application code?
6. Why `--workers 1` in the container?
7. Why does an empty test suite fail CI rather than pass trivially?
8. Why must OpenAI be mocked in tests, and where is the right seam?

---

## Summary of known issues

| # | Issue | File |
|---|---|---|
| 1 | **Live bug** — résumé upload / JD create return 500 (`created_at` KeyError) | `routers/resume.py:85`, `:174` |
| 2 | Dead code — `chat_completion_stream()` never called | `services/openai_client.py:211` |
| 4 | Dead code — `QuestionBankItem` model, zero usages | `models/question.py` |
| 5 | Hardcoded `"gpt-4o"` ignores `settings.openai_model_advanced` | `services/feedback_generator.py` |
| 6 | `_clamp` duplicated with differing behaviour | `followup_handler.py`, `feedback_generator.py` |
| 7 | `/api/speech/transcribe` is unauthenticated | `routers/speech.py` |
| 8 | Transcription blocks a worker up to 60s | `routers/speech.py` |
| 9 | Rate limiting is in-memory, no per-route limits | `middleware/rate_limit.py` |
| 10 | Follow-up `resume_context` is a hardcoded stub | `interview_engine.py:256` |
| 11 | On-the-fly generation passes `match_analysis` as `resume_data`, empty `jd_data` | `interview_engine.py:298` |
| 13 | Zero tests | — |
| 14 | `total_duration_seconds` read but never written | `feedback_generator.py` |

Items 1, 5, 6, 10, and 11 are small fixes with real impact. Item 13 blocks deployment automation.

---

**Back to:** [Backend index](README.md) · **See also:** [Frontend plan](../frontend_plan/README.md) · [Deployment plan](../deployment_plan/README.md)
