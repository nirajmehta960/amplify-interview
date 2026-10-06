# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Amplify Interview** — an AI mock-interview platform. Upload a résumé + job description, get an adaptive AI interview that scores every answer and adapts difficulty, then structured feedback and analytics.

Single repo, two deployables: the **React frontend** at the root (`src/`) and the **FastAPI backend** in `backend/`. They share no code or types and talk only over HTTP.

**Read [`docs/`](docs/) before non-trivial work.** Three phase-by-phase doc sets, all current as of 2026-08:
- [`docs/backend_plan/`](docs/backend_plan/README.md) — how the API is built (10 phases). Phases 5–8 (LLM layer, prompts, parsing, interview engine) are where the product lives.
- [`docs/frontend_plan/`](docs/frontend_plan/README.md) — how the client is built (8 phases).
- [`docs/deployment_plan/`](docs/deployment_plan/README.md) — manual AWS deployment (11 phases), plus [`DEPLOYMENT_AWS.md`](docs/deployment_plan/DEPLOYMENT_AWS.md) for the architecture rationale.
- [`docs/CLOUD_LEARNING_OBJECTIVES.md`](docs/CLOUD_LEARNING_OBJECTIVES.md) and [`docs/AWS_SETUP_RUNBOOK.md`](docs/AWS_SETUP_RUNBOOK.md) — infra concepts and a condensed command reference.

Each plan's final phase carries a known-issues table. This file lists only the load-bearing facts and the traps.

## Commands

### Frontend (repo root)

- `npm run dev` — Vite dev server on **port 3000** (not 5173; set in `vite.config.ts`). This must match the backend's `ALLOWED_ORIGINS` or every request fails CORS.
- `npm run build` / `npm run lint`
- ⚠️ **No `test` script and no `typecheck` script exist.** Combined with `strict: false` in `tsconfig.app.json`, essentially nothing is checked automatically. "Verifying" a change means `npm run lint` + `npm run build` + manual testing.
- ⚠️ **Two lockfiles are committed** (`bun.lockb` and `package-lock.json`). They will drift. Use `npm`; the bun lockfile is a leftover.

### Backend (`backend/`)

- `cd backend && ./venv/bin/python -m uvicorn app.main:app --reload --port 4000`
- ⚠️ The venv is **Python 3.9.6** (macOS system Python) while `backend/Dockerfile` ships **3.12**. Anything using PEP 604 (`str | None`) works in the container and fails locally. The planned SQLAlchemy 2.0 migration requires 3.10+ — recreate the venv on 3.12 before starting it.
- ⚠️ The venv drifts from `requirements.txt`. Re-run `./venv/bin/pip install -r requirements.txt` after pulls.
- Swagger UI at `http://localhost:4000/docs`, but **only when `DEBUG=true`** (gated in `main.py`).
- **`backend/.env` is not committed and you must hand-create it** — copy `backend/.env.example`, which documents every variable and is current.

### Tests

**There are none, in either half.** `pytest`, `pytest-asyncio`, and `pytest-cov` are in `backend/requirements.txt`; there are zero test files. This is not just untested code — `pytest` with nothing collected **exits code 5**, so the CI gate planned in deployment Phase 9 (`deploy: needs: test`) would block every deploy. Fix that before wiring CI.

When adding the suite: `asyncio_mode = auto` in `pytest.ini` is mandatory — without it async tests are **silently skipped and pytest still exits 0** (green CI, zero coverage).

## Architecture

### Frontend (`src/`)

React 18 + TypeScript + Vite, Tailwind + **shadcn/ui** (~45 Radix primitives generated into `src/components/ui/`), react-router-dom v6, framer-motion, Recharts. Path alias `@/` → `src/`, declared in **both** `vite.config.ts` and `tsconfig.app.json` — change one and you must change the other.

- **Routing** is declared centrally in `src/AppRoutes.tsx`: 5 public routes and 7 protected ones. Signed-in pages share one layout route (`ProtectedRoute` › `components/shell/AppShell` › `<Outlet/>`) that owns the dark rail; pages title themselves with `PageHeader` and must not mount their own sidebar (`src/test/chrome.test.ts` enforces it). The live interview (`/interview/session`) is protected but deliberately outside the shell.
- **Data fetching is hand-rolled** `useState` + `useEffect` + `try/catch/finally` in every page. `@tanstack/react-query` is installed and its provider is mounted in `App.tsx`, but there are **zero** `useQuery`/`useMutation` calls. Same story for `react-hook-form` + `@hookform/resolvers` — zero `useForm` calls; the auth pages use controlled `useState` plus `schema.parse()` and an `instanceof z.ZodError` branch.
- **All HTTP goes through `src/services/apiClient.ts`** — one generic `apiFetch<T>()` plus seven per-domain objects (`interviewApi`, `resumeApi`, `feedbackApi`, `analyticsApi`, `questionsApi`, `userApi`, `emailApi`). No component calls `fetch` directly. Auth header comes from `localStorage["amplify_id_token"]`.
- **Auth** (`src/contexts/AuthContext.tsx`) calls the Cognito IDP JSON API directly with raw `fetch` — no Amplify SDK. Tokens in `localStorage`.

### Backend (`backend/app/`)

FastAPI (app version 2.0.0), async throughout. **The layering rule is one-directional: `routers → services → prompts/db`.** A router never builds a prompt or calls OpenAI; a service never raises `HTTPException` or reads a header.

- **The one sanctioned exception:** services signal user-fixable problems by raising **`ValueError`**, which routers convert to a 400. Everything else becomes a logged 500. This is what keeps services HTTP-free while still distinguishing bad input from a real fault.
- **`app/services/openai_client.py` is the single LLM seam** — nothing else imports the OpenAI SDK. It provides `chat_completion`, `chat_completion_json`, and `chat_completion_structured` (which injects `model_json_schema()` into a system message — **prompt-based** structured output, not OpenAI's native `json_schema` mode, so OpenRouter works). It also tracks token cost in integer cents, threaded through every service return value as `TokenUsage`.
- **`app/prompts/*.py` are pure functions returning `List[Dict[str, str]]`** (always system + user). Services never build message dicts themselves.
- **`app/services/interview_engine.py` is the core state machine.** Difficulty adapts on a rolling 3-score window (≥78 up, ≤45 down, dead zone between). Follow-ups deliberately **do not advance `current_question_index`** — advancing it would silently shorten the interview.
- **Temperature is a per-task setting**, consistently: 0.1 extraction, 0.2 matching, 0.3 analysis/feedback, 0.7 question generation.
- **`gpt-4o-mini` is the default**; `gpt-4o` is used only for end-of-session feedback.

### Data, storage, auth

- **Database: AWS DynamoDB** via `app/db/dynamodb.py`, which exposes a document-style API (`create_document`/`get_document`/`list_documents`/`update_document`/`delete_document` + `*_col()` accessors). Collections: `resumes`, `job_descriptions`, `sessions`, `questions` (partitioned by `user_id`) and `messages` (partitioned by **`session_id`**, because a transcript is always read per-session).
- **Multi-tenancy is enforced by construction** — `user.uid` is baked into every collection reference and becomes the partition key, so there is no `WHERE user_id = ?` to forget. ⚠️ **This guarantee disappears under Postgres**, where tenant isolation becomes a predicate you must write on every query.
- **Storage: S3** (`app/db/storage.py`) for résumé/JD files and temp transcription audio, with presigned URLs. **Speech: AWS Transcribe.**
- **Auth: Cognito.** `app/middleware/auth.py` verifies RS256 JWTs against the pool's JWKS (cached 1h in a module global) — the backend **never calls Cognito per request**. `CurrentUser = Annotated[AuthUser, Depends(get_current_user)]` means protected endpoints just write `user: CurrentUser` as the first parameter; an endpoint without it is visibly public.
- **Config:** `app/config.py` is a `pydantic-settings` `Settings` accessed through an `@lru_cache`d `get_settings()`. Every field has a default so the app boots without a `.env`.

## The cross-layer contract

The frontend and backend share no types. These four rules are what actually hold them together — break one and something fails silently:

1. **snake_case all the way through.** `apiClient.ts` types mirror the backend's Pydantic models exactly; components read `res.session_progress.is_complete`. There is **no camelCase mapping layer**, deliberately — a backend field rename then produces a TypeScript error instead of `undefined`.
2. **Timestamps are `str`, not `datetime`.** Every timestamp field in every response model is typed `str` holding ISO-8601. Pydantic v2 does **not** coerce `datetime` → `str`; it raises, and the global handler turns that into a 500. Any repository returning a real `datetime` must `.isoformat()` at the boundary.
3. **`GET /api/interview/session/{id}/messages` has no `response_model`** and returns raw dicts, and `src/components/chat-interview/ChatBubble.tsx:221` reads `message.timestamp`. If the column is ever renamed to `created_at`, the **serialized key must stay `timestamp`** or chat timestamps silently vanish.
4. **Dev port pairing:** frontend 3000 ↔ backend 4000. The backend container listens on 8080 in production (Nginx proxies to it), which is why some stale defaults say 8080 — see gotchas.

When changing a route path or response shape, grep `src/services/apiClient.ts` for the endpoint and update both sides.

## Conventions & gotchas

**Auth / security**
- `mock-user-token` authenticates as a stub user, but **only when `ENVIRONMENT=development`** (`middleware/auth.py`). Deployed environments must set `ENVIRONMENT=production` or you ship an auth bypass.
- The frontend's mock mode triggers on the **absence** of `VITE_AWS_COGNITO_CLIENT_ID`. Since Vite inlines env vars at build time, a production build that fails to inline it ships an app where **any password works**. Verify the built bundle when changing build config.
- `POST /api/speech/transcribe` has **no `CurrentUser` dependency** — it is unauthenticated, so anyone can spend your Transcribe budget.

**Config**
- `allowed_origins` uses `Annotated[List[str], NoDecode]` plus a `field_validator`. `NoDecode` is required — without it, pydantic-settings JSON-decodes the env var *before* validators run, so `ALLOWED_ORIGINS=a,b,c` raises before your parser sees it.
- Both `.env.example` files are current and document every variable, including the two auth footguns above. Keep them updated when adding config.

**Frontend**
- **Colour only through tokens.** The UI is the cream/ink/electric-blue system in `src/index.css` (`--primary`, `--accent`, `--score-*`, `band-*` on the landing, `--sidebar-*` for the rail). Scores are coloured only via `src/lib/score.ts` (45/78, mirroring the interview engine). `src/test/palette.test.ts` fails on raw Tailwind palette classes (`bg-blue-500` …) in the redesigned files — Tailwind ignores unknown classes silently, which is how the old theme's leftovers rendered unstyled.
- Dark mode is ~90% built and 0% reachable: a complete `.dark` token block exists and `darkMode: ["class"]` is set, but nothing ever adds the class and there is no `ThemeProvider`.
- `src/services/deepgramTranscriptionService.ts` is misnamed twice — there is no Deepgram (the backend uses AWS Transcribe) and `createStreamingSession()` doesn't stream (it buffers blobs and POSTs once). It also bypasses `apiClient`, sends no auth header, and **defaults to port 8080** while `apiClient` defaults to 4000.

**AWS side effects**
- `db/dynamodb.py` and `db/storage.py` **auto-create real DynamoDB tables and the S3 bucket** on first use when credentials are present (`~/.aws/credentials` is picked up automatically). Hitting data endpoints locally touches your real AWS account.

**Style**
- Model output is never trusted: every LLM consumer rebuilds its object field-by-field with `.get(..., default)` and clamps scores, rather than `Model(**data)`. Keep that habit — a hard validation failure mid-interview loses the user's answer.
- Prompts request a shape; services verify it. Scoring rubrics in `prompts/` are load-bearing — without calibration bands, scores aren't comparable across calls, and the whole difficulty-adaptation mechanism keys off score thresholds.

## Known broken / in progress

**In progress:** the backend is being migrated from DynamoDB to **PostgreSQL** (SQLAlchemy 2.0 async + Alembic). Plan: [`docs/deployment_plan/PHASE_05_code_migration.md`](docs/deployment_plan/PHASE_05_code_migration.md). Nothing has landed yet — no `sqlalchemy`/`asyncpg`/`alembic` in `requirements.txt`, no `alembic/` directory.

**Live bug:** `backend/app/routers/resume.py:85` (and `:174` for JDs) reads `resume_data["created_at"]`, but `create_document` injects that key into its own copy — the caller's dict never gets it. **Résumé upload and JD creation return 500 on every successful request.** The broad `except Exception` converts the `KeyError` into a generic 500, which is why it hasn't been obvious.

**Dead code, safe to delete (backend):** `openai_client.chat_completion_stream()` (never called), `models/question.py`'s `QuestionBankItem` (zero usages). (The frontend's dead services, logo components and `lib/design-system.ts` were deleted in the 2026-10 UI redesign.)

**GCP/Firebase is fully removed** (2026-08-10): `db/firestore.py`, `firebase.json`, `.firebaserc`, `cloudbuild.yaml`, the `firebase` npm dep, the Firebase deploy scripts, all dead GCP config fields, and the `gs://` URI fallbacks are gone. `gcp_speech_language` was renamed to **`aws_transcribe_language`** (env var `AWS_TRANSCRIBE_LANGUAGE`). This project is AWS-only.

**Mocked pages are gone** (2026-10): `SessionReview`, `AnalyticsDashboard`, `ModernAnalyticsDashboard`, `AnalyticsDemo` and `ProcessingInterview` were hardcoded and unlinked, and were deleted with their routes (the old URLs 404). The real analytics are `Dashboard`, `Progress` and `Insights`, shaped by the pure functions in `src/components/analytics/analytics.ts`. Their rule: report only what `routers/analytics.py` returned — "—" or an honest empty state until there is data, a `LoadError` when a request fails.

**Practice questions are standalone:** the question bank (`routers/questions.py`) is never read by the interview engine; interviews are generated from the résumé and JD only.

**Known behavioural gaps:** no token refresh (sessions 401 after ~1 hour); `/interview/session` takes no session ID in the URL, so refreshing mid-interview starts a new session and orphans the old one; no interview video is ever recorded despite `useVideoRecording.ts` being fully built (it is used only for voice input); rate limiting is `memory://` with no per-route decorators, so it doesn't work across workers; `routers/speech.py` blocks a worker up to 60s polling Transcribe.
