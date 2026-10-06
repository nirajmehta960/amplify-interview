# Phase 5 — Code Migration: DynamoDB → PostgreSQL

**Goal:** rewrite the persistence layer onto SQLAlchemy 2.0 async + Alembic, so the backend can actually use RDS.
**Time:** 8–12 hours (the longest phase by a wide margin — expect 3–4 sittings)
**Prerequisites:** Phases 1–4; Docker running locally; Python 3.11+
**Cost impact:** $0 — this phase is entirely local, no AWS resources involved
**Read first:** `../CLOUD_LEARNING_OBJECTIVES.md` §4 (RDS / relational databases)
**Detailed plan:** `~/.claude/plans/peaceful-riding-hippo.md`

---

## Why this phase exists, and why it's here

The backend is 100% DynamoDB today. `backend/requirements.txt` has no `sqlalchemy`, no `asyncpg`, no `alembic`, and there is no `alembic/` directory. Eight files import `app/db/dynamodb.py`.

So Phase 6 can provision a beautiful RDS instance and **nothing will connect to it**. This phase is the bridge, and it is genuinely the bulk of the work in this whole project.

The reason for going relational at all is stated in `DEPLOYMENT_AWS.md`: SQL, migrations, joins, and connection pooling are higher-value fundamentals than DynamoDB single-table modelling. This phase is where you actually learn them — several aggregations currently done with Python loops become real `GROUP BY` queries.

---

## Concepts you need

**ORM and the identity map** — SQLAlchemy tracks loaded objects. Mutate an attribute on a loaded object and `commit()` emits an `UPDATE` automatically; there is no explicit "save" call. This is the biggest mental shift from the document API.

**Async SQLAlchemy** — `AsyncSession` wraps a connection from a pool. It is **not** thread-safe or task-safe; one session per request, always passed explicitly.

**Migrations** — Alembic versions your schema in files, in git, applied in order. This replaces DynamoDB's `_ensure_table_exists` auto-create magic. After this phase, **a table that doesn't exist is an error, not a prompt to create one.**

**Hybrid schema** — real columns for things you filter, sort, or join on; `JSONB` for nested blobs you only ever read whole. Getting this split right is the core modelling lesson.

**Transaction boundaries** — a transaction holds a connection. Hold one across a slow API call and you exhaust the pool. This matters enormously here, and is covered in §5.4 below.

---

## The schema

Six tables. Full DDL is in `DEPLOYMENT_AWS.md` Appendix B, with these corrections (Appendix B does not currently match what the code writes — fix the doc as you go):

| Table | Real columns | JSONB |
|---|---|---|
| `resumes` | id, user_id, file_name, **s3_uri**, **raw_text**, **file_type**, **tokens_used**, **cost_cents**, created_at | parsed_data |
| `job_descriptions` | id, user_id, company, role_title, raw_text, **tokens_used**, **cost_cents**, created_at | parsed_data |
| `sessions` | id, user_id, mode, status, resume_id (FK), jd_id (FK), current_question_index, current_difficulty, topics_covered `TEXT[]`, total_tokens, total_cost_cents, created_at, completed_at | config, match_analysis, questions_generated, scores |
| `messages` | id, session_id (FK **CASCADE**), role, content, duration_seconds, created_at | question_metadata, analysis |
| `feedback` | session_id (PK+FK), user_id, **overall_score**, **readiness_level**, created_at | payload |
| `user_questions` | id, user_id, question_text, category, created_at, updated_at | — |

**Bolded** entries are corrections to Appendix B. The `feedback` table is a genuine relocation: feedback currently lives embedded as `session["summary"]`, and `overall_score`/`readiness_level` must be lifted into real columns because analytics groups on them.

---

## Steps

### 5.1 — Environment

The system Python is **3.9.6**, which is too old — SQLAlchemy 2.0's `Mapped[...]` annotations are evaluated at runtime and PEP 604 (`str | None`) needs 3.10+. The Dockerfile ships 3.12. Make all three agree (local venv, Dockerfile, CI).

```bash
brew install python@3.12          # or use the 3.11 already installed, and pin Dockerfile+CI to 3.11
cd backend
rm -rf venv && python3.12 -m venv venv
./venv/bin/pip install -r requirements.txt
```

Start local Postgres — **Docker Desktop must be running first**:
```bash
docker run -d --name amplify-pg -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=amplify_interview -p 5432:5432 postgres:16
docker exec -it amplify-pg psql -U postgres -d amplify_interview -c "SELECT version();"
```

### 5.2 — Test harness first

Do this **before** touching any persistence code. There are currently zero test files, and the CI gate planned in Phase 9 runs `pytest` — which exits code 5 ("no tests collected") and **fails the build**. Fix that while there is no risk in flight.

Add `backend/pytest.ini` with `asyncio_mode = auto`, a `tests/` tree, and three pure-unit tests: `_next_difficulty` (interview_engine), `_clamp` (feedback_generator), `calculate_cost` (openai_client).

> ⚠️ Without `asyncio_mode = auto`, async tests are **silently skipped and pytest still exits 0** — green CI, zero coverage. Verify the harness by making one test deliberately fail and confirming you see red.

**Done when:** `pytest` exits 0 with 3 passing tests.

### 5.3 — Infrastructure, no callers yet

Add `sqlalchemy[asyncio]>=2.0`, `asyncpg`, `alembic` to requirements. Then:

- **`app/db/database.py`** — lazy engine (created on first use, *not* at import, so tests can repoint it), `async_sessionmaker(expire_on_commit=False)`, and a `get_db` FastAPI dependency.
- **`app/db/models.py`** — SQLAlchemy 2.0 `DeclarativeBase` models for the six tables.
- **`alembic/`** — `alembic init`, point `env.py` at `Base.metadata`, autogenerate the first revision, then **hand-review it**.
- **`app/config.py`** — add `database_url`; delete `aws_dynamodb_table_prefix`. (The dead GCP/Firebase fields were already removed on 2026-08-10, and `gcp_speech_language` renamed to `aws_transcribe_language`.)

Three settings are load-bearing and each fails in a confusing way if you skip it:
- `expire_on_commit=False` — routers read ORM attributes *after* commit to build responses. The default triggers a lazy refresh outside greenlet context and raises `MissingGreenlet`.
- `ondelete="CASCADE"` on FKs to `sessions` — Alembic autogenerates from the **ORM**, not from Appendix B's SQL. Omit it and session deletion raises `IntegrityError`.
- `pool_pre_ping=True` + `pool_recycle=1800` — RDS silently drops idle connections; without these you get random dead-connection errors in production, never locally.

**Done when:** `alembic upgrade head` creates six tables, and `alembic downgrade base && alembic upgrade head` round-trips cleanly. Nothing imports this yet; the app still boots on DynamoDB.

### 5.4 — Migrate one entity at a time

`dynamodb.py` stays in place until the end. Each step below leaves the app bootable and tests green.

**(a) `user_questions`** — `routers/questions.py`. Flat CRUD, no joins, no LLM. Deliberately first: it exercises every hazard in miniature (UUID→str, TIMESTAMPTZ→str, nullable `updated_at`, per-user scoping) with almost no blast radius. The `?category=`/`?q=` filters move from fetching 500 rows and filtering in Python to `=` and `ILIKE` in SQL.

**(b) `resumes` + `job_descriptions`** — `routers/resume.py`. The manual resume↔JD join in `/match` becomes a real two-row fetch.

> **A live bug you will fix here:** `routers/resume.py:85` reads `resume_data["created_at"]`, but that dict never contains the key — `create_document` injects it into its own copy. **Résumé upload currently returns 500.** Same pattern at the JD endpoint. Don't faithfully port it; use the returned row's `created_at`.

**(c) `sessions` + `messages`** — `services/interview_engine.py` and `routers/interview.py`. The heavy one. The message-deletion loop in `DELETE /session/{id}` becomes `ON DELETE CASCADE`.

Two traps in `process_response()`:

1. **JSONB/ARRAY columns are not mutation-tracked.** `s.scores.append(x)` is **silently discarded** — no error, no UPDATE, the score just vanishes. Always reassign: `s.scores = [*scores, new_score]`. This is the single easiest bug to ship here.

2. **Do not hold one transaction across the request.** The function makes 2–3 OpenAI calls (each up to 60s with retries) between reading and writing the session. An open transaction there pins a pooled connection `idle in transaction` and exhausts the pool at ~10 concurrent users. Structure it in three parts: read + commit immediately → LLM calls with zero DB access → re-read `FOR UPDATE`, mutate, single commit.

**(d) `feedback`** — `services/feedback_generator.py`, `routers/feedback.py`, `routers/analytics.py`. The `session["summary"]` → own-table relocation. Write `overall_score` and `readiness_level` into **real columns**, not just into `payload` — otherwise the session list and every analytics `GROUP BY` silently return nulls with no error at all.

This is also where the SQL payoff lands. `/overview` becomes one query with `COUNT`/`AVG`/`SUM` over `sessions LEFT JOIN feedback`; `readiness_distribution` and `mode_distribution` become `GROUP BY`; `top_strengths` becomes `jsonb_array_elements_text(...) GROUP BY ... ORDER BY count DESC LIMIT 5`, replacing the only genuinely O(n·m) Python loop in the codebase.

Use **`LEFT JOIN`**, never `INNER` — an inner join silently drops every session that has no feedback yet from the session list.

### 5.5 — Cutover

Delete `app/db/dynamodb.py` (`firestore.py` is already gone). Replace the DynamoDB startup ping in `main.py` with `SELECT 1`.

**Done when:** `grep -rn "dynamodb" backend/app` returns nothing.

---

## Contract rules the frontend depends on

The frontend is not changing in this phase, so these are hard requirements:

1. **`datetime` → `str`.** Response models type these as `str`, and Pydantic v2 does **not** coerce — it raises, and the global handler turns it into a 500. Call `.isoformat()` at the repository boundary, `None`-guarding nullable fields.
2. **`uuid.UUID` → `str`.** Wrap all IDs with `str(...)` on the way out.
3. **Keep the `timestamp` key on messages.** The column is `created_at`, but `GET /session/{id}/messages` has no `response_model` and `src/components/chat-interview/ChatBubble.tsx:221` reads `message.timestamp`. Rename the serialized key and chat timestamps silently disappear.
4. **Old IDs were `uuid4().hex`** (32 chars, no dashes); Postgres emits dashed 36-char. A stale bookmarked URL must return **404, not 500** — wrap path-param parsing in `try/except ValueError`.

---

## ✅ Checkpoints

- [ ] `pytest` exits 0 (~25 tests) against real Postgres — **not** SQLite; `JSONB`, `TEXT[]`, `gen_random_uuid()` and cascade deletes are all load-bearing and SQLite would pass while the real DDL is broken.
- [ ] `alembic upgrade head` from empty creates all six tables.
- [ ] `psql \d+ messages` shows `ON DELETE CASCADE` on the session FK.
- [ ] Full local round trip: sign in → upload résumé + JD → complete an interview → feedback renders → session appears on the dashboard with its score → chat timestamps render.
- [ ] `SELECT count(*) FROM pg_stat_activity WHERE state='idle in transaction'` stays at **0** during an interview.
- [ ] `grep -rn "dynamodb" backend/app` is empty.

---

## 🧠 You understand this when you can answer, without notes

1. Why does `s.scores.append(x)` fail to persist while `s.scores = [...]` works?
2. What is the concrete failure mode of holding a transaction open across a 60-second OpenAI call?
3. Why must `overall_score` be a real column rather than just living inside `payload` JSONB?
4. What breaks if the feedback join is `INNER` instead of `LEFT`?
5. Why is a migration file better than the auto-create behaviour DynamoDB had?
6. Which fields belong in JSONB and which belong in columns — and what is the rule you used to decide?

---

## 🔧 Troubleshooting

**`MissingGreenlet`** — you touched a lazily-loaded attribute outside async context. Either the sessionmaker is missing `expire_on_commit=False`, or a relationship needs an explicit `selectinload`.

**`InvalidRequestError` about the driver** — `DATABASE_URL` uses the sync scheme. It must be `postgresql+asyncpg://`. Add a validator that rewrites `postgres://`/`postgresql://` automatically, because RDS and Secrets Manager both hand you the sync form.

**Alembic autogenerate produces an empty migration** — `env.py` isn't importing your models, so `Base.metadata` is empty. Import `app.db.models` in `env.py`.

**Scores silently don't persist** — the in-place JSONB mutation trap. Reassign the list.

**Tests pass individually but fail together** — test isolation. Use transaction-rollback per test with `join_transaction_mode="create_savepoint"` so repository `commit()` calls land on a savepoint and still roll back.

---

## 📝 Record

Nothing for `aws-ids.txt` — this phase produces code, not infrastructure. Commit it on a branch and make sure CI is green before Phase 6.

---

**Next:** [Phase 6 — RDS PostgreSQL](PHASE_06_rds.md)
