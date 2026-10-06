# Backend Phase 1 — Foundations

**What this covers:** project layout, the FastAPI app object, typed configuration, and startup lifecycle.
**Files:** `backend/app/main.py`, `backend/app/config.py`, `backend/requirements.txt`
**You need to know:** Python packages, `async`/`await`, ASGI, environment variables

---

## The layout, and the rule behind it

```
backend/app/
├── main.py            # app object, middleware, router registration, health
├── config.py          # typed settings from env
├── models/            # Pydantic contracts (HTTP + LLM schemas)
├── routers/           # HTTP layer — thin
├── services/          # business logic — no HTTP awareness
├── prompts/           # LLM message builders — pure functions
├── middleware/        # auth, rate limiting
└── db/                # persistence + object storage
```

**The dependency rule is one-directional:** `routers → services → prompts/db`. A router never builds a prompt or calls OpenAI. A service never raises `HTTPException` or reads a header. Break that and everything becomes untestable at once.

The one sanctioned exception is how services signal user error: they raise **`ValueError`**, and routers translate it to a 400. That keeps services HTTP-free while still distinguishing "you sent bad input" from "we broke".

---

## Configuration — `config.py`

One `Settings(BaseSettings)` class, every field typed **with a default**, so the app boots with no `.env` at all. That matters: a missing env var should degrade a feature, not prevent startup.

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False,
    )
    app_name: str = "Amplify Interview API"
    environment: str = "development"      # development | staging | production
    openai_model_default: str = "gpt-4o-mini"
    openai_model_advanced: str = "gpt-4o"
    max_resume_size_mb: int = 10

    @property
    def max_resume_size_bytes(self) -> int:
        return self.max_resume_size_mb * 1024 * 1024

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

Three patterns worth copying:

**`@lru_cache` singleton.** `get_settings()` is called from everywhere and parses the environment exactly once. (In tests, `get_settings.cache_clear()` is required after mutating env vars — a classic trap.)

**Derived values as `@property`,** not stored fields. `max_resume_size_bytes` can't drift out of sync with `max_resume_size_mb`.

**`environment` is a security control, not a label.** `middleware/auth.py` accepts the fake token `mock-user-token` **only** when it equals `"development"`, and `main.py` gates `/docs` on `debug`. Deploy with the wrong value and you ship an auth bypass.

### The `NoDecode` trick

The one genuinely subtle piece of config:

```python
allowed_origins: Annotated[List[str], NoDecode] = ["http://localhost:3000", ...]

@field_validator("allowed_origins", mode="before")
@classmethod
def parse_allowed_origins(cls, v: Any) -> Any:
    if isinstance(v, str):
        raw = v.strip()
        if raw.startswith("[") and raw.endswith("]"):
            try:    return json.loads(raw)
            except json.JSONDecodeError:  pass
        return [s.strip() for s in raw.split(",") if s.strip()]
    return v
```

pydantic-settings tries to JSON-decode any env var typed as a complex type **before validators run**. So `ALLOWED_ORIGINS=http://a.com,http://b.com` raises a parse error you cannot intercept. **`NoDecode` disables that pre-parsing**, letting the validator accept both comma-separated and JSON-array forms.

If you ever see "Settings works with a JSON array but not a comma list," this is why.

---

## The app object — `main.py`

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    try:
        get_dynamodb_resource()          # warm the client
    except Exception as e:
        logger.warning(f"DynamoDB initialization deferred: {e}")
    yield
    logger.info("Shutting down")

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs" if settings.debug else None,     # no public API docs in prod
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)
```

**Lifespan** replaces the deprecated `@app.on_event`. Code before `yield` runs at startup, after it at shutdown. Warming the AWS client here moves connection setup off the first user request.

**Startup failure is a warning, not a crash.** If AWS is unreachable, the app still boots and serves `/health`. A container that refuses to start is much harder to diagnose than one that starts and reports unhealthy — and under an orchestrator, crash-looping hides the logs you need.

### Middleware order

```python
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

CORS must be outermost — error responses need CORS headers too, or the browser shows an opaque CORS failure instead of your actual 500.

### The catch-all handler

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500,
        content={"detail": "An internal error occurred. Please try again later."})
```

Full traceback to the logs, generic message to the client. Stack traces in HTTP responses leak file paths, library versions, and sometimes secrets.

### Health endpoints

`/health` returns status, version, and environment — this is what the CI health-check curls after deploy. `/` returns an endpoint index, which is a genuinely useful bit of self-documentation when docs are disabled in production.

---

## Dependency choices worth understanding

From `requirements.txt`:

- **`uvicorn[standard]`** — the extra pulls in `uvloop` and `httptools`, a meaningful async performance win over the bare package.
- **`python-multipart`** — required for `UploadFile`. Without it, file upload endpoints fail at import with a confusing error.
- **`email-validator`** — required by Pydantic's `EmailStr`. Same story: it fails at import, not at request time.
- **`python-jose[cryptography]`** — the extra provides the C-backed RSA implementation. Without it, JWT verification is dramatically slower.
- **Upper bounds on everything** (`fastapi>=0.115,<1.0`) — protects against a major-version break arriving via an unpinned rebuild.

---

## 🧠 Check your understanding

1. Why does every settings field have a default?
2. What does `NoDecode` actually prevent, and why can't a validator fix it alone?
3. Why is a failed AWS connection at startup a warning rather than a fatal error?
4. Why must CORS middleware be added before the others?
5. Why do services raise `ValueError` instead of `HTTPException`?

---

## ⚠️ Known issues in this layer

Resolved 2026-08-10 — the GCP/Firebase migration is complete. The five dead config fields (`gcp_project_id`, `gcs_bucket_name`, `firestore_database`, `firebase_project_id`, `firebase_service_account_path`) are deleted, and `main.py` now logs the AWS region instead of a GCP project.

`gcp_speech_language` was **renamed** rather than deleted — it was never dead, only misnamed. It is now `aws_transcribe_language` (env var `AWS_TRANSCRIBE_LANGUAGE`), still used as the AWS Transcribe `LanguageCode` in `routers/speech.py`.

---

**Next:** [Phase 2 — Data contracts](PHASE_02_data_contracts.md)
