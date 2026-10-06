# Amplify Interview

![Amplify Interview](https://img.shields.io/badge/Amplify%20Interview-Interview%20Platform-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)
![AWS](https://img.shields.io/badge/AWS-Cognito%20%7C%20S3%20%7C%20Transcribe-FF9900?logo=amazonaws)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?logo=openai)

**AI-powered mock interview platform for technical, behavioural, and mixed interview preparation.**

Upload a **résumé** and a **job description**, get questions targeted at the specific gaps between them, run an **adaptive interview** where difficulty responds to your answers, and receive structured feedback with per-dimension scoring.

---

## Architecture

```
Browser (React + Vite on CloudFront/S3)
        │  Cognito JWT  (Authorization: Bearer …)
        ▼
   Nginx (TLS) ──► FastAPI in Docker on EC2
                        │
        ┌───────────────┼────────────────┬──────────────┐
        ▼               ▼                ▼              ▼
   DynamoDB          Amazon S3      AWS Transcribe   OpenAI API
  (sessions,      (résumé files,     (voice → text)   (GPT-4o /
   messages,      temp audio)                          GPT-4o-mini)
   résumés)
```

**AWS services:** Cognito (auth), DynamoDB (data), S3 (files), Transcribe (speech), EC2 + ECR (compute), CloudFront (CDN), SSM Parameter Store (config), CloudWatch (observability).

> **Migration in progress:** the data layer is moving from DynamoDB to **RDS PostgreSQL** (SQLAlchemy 2.0 + Alembic). See [`docs/deployment_plan/PHASE_05_code_migration.md`](docs/deployment_plan/PHASE_05_code_migration.md).

---

## Features

### Interview experience

- **Résumé + JD ingestion** — PDF/DOCX text extraction, then LLM structuring into typed objects
- **Gap-driven question generation** — a résumé↔JD match analysis produces `interview_focus_areas` and `missing_skills`, which feed directly into question generation. This is what makes questions personal rather than generic.
- **Adaptive difficulty** — a rolling 3-answer window raises difficulty above an average of 78 and lowers it below 45, with a dead zone between so it doesn't oscillate
- **Dynamic follow-ups** — vague or notable answers trigger a follow-up (`clarify` / `deepen` / `verify` / `pivot`) instead of moving on
- **On-the-fly generation** — if you outpace the pre-generated question set, new questions are generated mid-interview, avoiding topics already covered
- **Voice input** — answers can be spoken; audio is transcribed via AWS Transcribe and dropped into the input box so you can edit before submitting
- **Practice question bank** — save and categorise your own questions

### Analytics & feedback

- **Per-answer scoring** across seven dimensions (relevance, specificity, structure, depth, clarity, confidence, overall)
- **End-of-session feedback** — a single GPT-4o pass over the whole transcript producing strengths, improvements, and a readiness level
- **Progress tracking** — score timelines, skill breakdowns, and readiness distribution across sessions

---

## Tech stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5.8 |
| Build | Vite 5 (dev server on **port 3000**) |
| Styling | Tailwind CSS 3.4 + shadcn/ui (Radix) |
| Routing | React Router 6 |
| Animation / charts | Framer Motion · Recharts |
| Validation | Zod |
| Auth client | Cognito IDP API via raw `fetch` (no Amplify SDK) |
| Media | MediaRecorder API |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI + Uvicorn (Python 3.12) |
| Validation | Pydantic v2 + pydantic-settings |
| Auth | AWS Cognito JWTs, verified locally against JWKS (`python-jose`) |
| Database | AWS DynamoDB *(migrating to RDS PostgreSQL)* |
| File storage | Amazon S3 (presigned URLs) |
| Transcription | AWS Transcribe |
| LLM | OpenAI GPT-4o / GPT-4o-mini — OpenRouter-compatible via `OPENAI_API_BASE` |
| Parsing | PyPDF2 · python-docx |
| Email | Resend |

---

## Repository structure

```
amplify-interview/
├── CLAUDE.md                   # Load-bearing facts + gotchas — read this first
├── docs/
│   ├── backend_plan/           # How the API is built (10 phases)
│   ├── frontend_plan/          # How the client is built (8 phases)
│   ├── deployment_plan/        # Manual AWS deployment (11 phases)
│   ├── AWS_SETUP_RUNBOOK.md    # Condensed command reference
│   └── CLOUD_LEARNING_OBJECTIVES.md
├── backend/
│   ├── app/
│   │   ├── main.py             # App, CORS, middleware, router registration
│   │   ├── config.py           # pydantic-settings (the only reader of env vars)
│   │   ├── middleware/         # Cognito JWT auth, rate limiting
│   │   ├── models/             # Pydantic contracts — also used as LLM schemas
│   │   ├── routers/            # HTTP layer (thin)
│   │   ├── services/           # Business logic (no HTTP awareness)
│   │   │   ├── openai_client.py      # The single LLM seam
│   │   │   ├── interview_engine.py   # Adaptive state machine
│   │   │   ├── question_generator.py · followup_handler.py
│   │   │   ├── feedback_generator.py · matching_engine.py
│   │   │   └── resume_parser.py · jd_parser.py
│   │   ├── prompts/            # Pure functions returning message lists
│   │   └── db/                 # dynamodb.py · storage.py (S3)
│   ├── Dockerfile
│   └── requirements.txt
├── src/
│   ├── components/ui/          # shadcn/ui primitives
│   ├── components/chat-interview/
│   ├── contexts/AuthContext.tsx
│   ├── hooks/useVideoRecording.ts
│   ├── pages/
│   └── services/apiClient.ts   # Typed client — all HTTP goes through here
└── vite.config.ts · tailwind.config.ts · package.json
```

---

## Local development

**Prerequisites:** Node.js 20+, Python 3.12, and an AWS account if you want real auth/storage.

### 1. Frontend

```bash
npm install
cp .env.example .env      # then fill it in
npm run dev               # http://localhost:3000
```

Leaving `VITE_AWS_COGNITO_CLIENT_ID` empty runs the app in **mock auth mode** — any email/password signs in. That is the fastest way to work on UI without provisioning Cognito.

### 2. Backend

```bash
cd backend
python3.12 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.example .env      # then fill it in

./venv/bin/python -m uvicorn app.main:app --reload --port 4000
```

API at `http://localhost:4000`, interactive docs at `/docs` (only when `DEBUG=true`).

With `ENVIRONMENT=development`, the literal token `mock-user-token` authenticates as a stub user — useful for exercising protected routes with `curl`.

> ⚠️ `db/dynamodb.py` and `db/storage.py` **auto-create real DynamoDB tables and the S3 bucket** on first use when AWS credentials are present. Hitting a data endpoint locally touches your real AWS account.

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

---

## Deployment

Deployed manually to AWS, phase by phase, in [`docs/deployment_plan/`](docs/deployment_plan/README.md). Each phase is one work session ending in verifiable checkpoints.

```
1  Foundations (IAM, MFA, CLI, billing alarm)
2  Networking (VPC, security groups, SG-to-SG)
3  S3 bucket + EC2 instance role
4  Cognito user pool
5  Code migration: DynamoDB → PostgreSQL     ← longest phase, purely local
6  RDS PostgreSQL + SSM Parameter Store
7  Docker image + ECR
8  EC2 + Nginx + TLS                          ← first live deploy
9  GitHub Actions CI/CD (OIDC, no stored keys)
10 Frontend on S3 + CloudFront
11 CloudWatch observability
```

Target architecture: EC2 + Docker + Nginx + RDS + S3 + Cognito, with the frontend on CloudFront. Stage 2 (App Runner/ECS, Terraform, SQS, ElastiCache) is mapped out in [`DEPLOYMENT_AWS.md`](docs/deployment_plan/DEPLOYMENT_AWS.md).

**No long-lived credentials anywhere** — the EC2 instance profile grants AWS access on the box, and GitHub Actions assumes a role via OIDC.

---

## API overview

All routes are under `/api` and require `Authorization: Bearer <Cognito ID token>`, except `/health`, `/`, and `/api/speech/transcribe`.

| Router | Key endpoints |
|---|---|
| `/api/resume` | `POST /upload`, `GET /list`, `POST /jd`, `POST /match` |
| `/api/interview` | `POST /session`, `POST /session/{id}/message`, `GET /sessions`, `GET /session/{id}/messages`, `POST /session/{id}/end` |
| `/api/feedback` | `POST /session/{id}`, `GET /session/{id}`, `GET /session/{id}/questions` |
| `/api/analytics` | `GET /overview`, `GET /progress`, `GET /skills` |
| `/api/questions` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| `/api/user` | `GET /profile` |
| `/api/speech` | `POST /transcribe` |
| `/health` | `GET` |

---

## Security

- **Cognito JWTs verified locally** against the pool's JWKS (cached 1h) — the backend never calls Cognito per request
- **No long-lived AWS keys** — instance profile on EC2, OIDC in CI
- **Private by default** — S3 blocks public access and serves via presigned URLs; RDS has no public IP and accepts connections only from the app's security group
- **Secrets in SSM Parameter Store** as `SecureString`, fetched at deploy time — never baked into an image
- **Multi-tenancy by construction** — the authenticated user's ID is the DynamoDB partition key on every read and write

---

## Documentation

| Doc | Contents |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Load-bearing facts, gotchas, the cross-layer contract, known issues |
| [`docs/backend_plan/`](docs/backend_plan/README.md) | How the API is built, phase by phase |
| [`docs/frontend_plan/`](docs/frontend_plan/README.md) | How the client is built, phase by phase |
| [`docs/deployment_plan/`](docs/deployment_plan/README.md) | Manual AWS deployment |
| [`docs/CLOUD_LEARNING_OBJECTIVES.md`](docs/CLOUD_LEARNING_OBJECTIVES.md) | The infrastructure concepts, from the ground up |

Each plan's final phase carries a known-issues table — including what is currently mocked or unfinished.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push and open a Pull Request against `main`

---

## Copyright

Copyright (c) 2025 Niraj Mehta. All rights reserved.

**Author:** Niraj Mehta — [@nirajmehta960](https://github.com/nirajmehta960)
