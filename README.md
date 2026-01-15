# Amplify Interview

![Amplify Interview](https://img.shields.io/badge/Amplify%20Interview-Interview%20Platform-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)
![FastAPI](https://img.shields.io/badge/FastAPI-0.11x-009688?logo=fastapi)
![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)
![GCP](https://img.shields.io/badge/Google%20Cloud-Run%20%7C%20Firestore%20%7C%20Storage-4285F4?logo=googlecloud)

**AI-Powered Mock Interview Platform for Technical, Behavioral, Leadership, and Custom Domain Interview Preparation**

Amplify Interview is a full-stack mock interview platform that uses **OpenRouter (OpenAI-compatible API)** and Google Cloud services to deliver personalized interview coaching, detailed performance analysis, and skill development tracking. Upload a **resume** and **job description**, get role-targeted question generation, run an **adaptive real-time interview** (behavioral, technical, or mixed), and receive structured feedback — all on a 100% GCP/Firebase backend.

---

## Architecture

```
Browser (React + Vite)
        │  Firebase Auth JWT
        ▼
Firebase Hosting  ──────────────►  Cloud Run (FastAPI)
                                        │
                          ┌─────────────┼─────────────────┐
                          ▼             ▼                   ▼
                    Cloud Firestore  Cloud Storage    Cloud Speech-to-Text
                    (sessions, users, (resume PDFs)  (voice transcription)
                     question bank)
                          │
                    Secret Manager   Artifact Registry   Cloud Build
                    (API keys)       (Docker images)     (CI/CD)
```

**Google Cloud services used:** Cloud Run, Cloud Firestore, Cloud Storage, Cloud Speech-to-Text, Secret Manager, Artifact Registry, Cloud Build, Firebase Auth, Firebase Hosting, Google Analytics 4

---

## Features

### Interview Experience

- **Resume + Job Description ingestion** — upload your resume and target JD; backend extracts and analyzes content
- **Personalized Question Generation (LLM)** — role-targeted questions (e.g., Software Engineer, Data Analyst, Product Manager) using **OpenRouter** (OpenAI-compatible)
- **Adaptive Real-Time Interviews** — questions adjust in real time based on your answers; follow-ups generated dynamically and difficulty adapts
- **Voice Input** — speak your answers; Google Cloud Speech-to-Text transcribes them instantly
- **Multiple Interview Types** — Behavioral, Technical, Leadership, and Custom domain formats
- **Custom Question Bank** — build and manage personal question collections by category and domain
- **Resume-Aware Sessions** — the backend tailors questions to your background and target role

### Analytics & Feedback

- **AI-Powered Feedback** — structured feedback with strengths, weaknesses, and improvement suggestions
- **Progress Tracking** — score timeline charts across sessions
- **Skill Breakdown** — per-dimension scores (communication, structure, content, confidence)
- **Interview Readiness Score** — aggregate readiness rating derived from all completed sessions
- **Session History** — full record of sessions with per-question scores and transcripts

### Platform

- **Firebase Auth** — email/password and Google OAuth, JWT tokens sent to every backend request
- **Transactional Email** — welcome emails via Resend
- **Google Analytics 4** — page view and event tracking
- **CI/CD** — Cloud Build automatically builds Docker image, deploys Cloud Run, and deploys Firebase Hosting on every push to `main`

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS + shadcn/ui |
| Routing | React Router 6 |
| Data fetching | TanStack Query |
| Animations | Framer Motion |
| Charts | Recharts |
| Auth client | Firebase JS SDK 12 |
| Analytics | react-ga4 (GA4) |
| Hosting | Firebase Hosting |

### Backend

| Layer | Technology |
|---|---|
| Framework | FastAPI (Python) |
| Runtime | Cloud Run (us-central1, port 8080) |
| Container registry | Artifact Registry |
| Auth verification | Firebase Admin SDK (JWT) |
| Database | Cloud Firestore (Native mode) |
| File storage | Cloud Storage |
| Transcription | Cloud Speech-to-Text |
| LLM | OpenRouter (OpenAI-compatible) → OpenAI models (e.g. GPT-4o / GPT-4o-mini) |
| Email | Resend |
| Secrets | Secret Manager |
| CI/CD | Cloud Build + `cloudbuild.yaml` |

---

## Repository Structure

```
amplify-interview/
├── backend/                    # FastAPI backend (deployed to Cloud Run)
│   ├── app/
│   │   ├── main.py             # App entrypoint, CORS, router registration
│   │   ├── config.py           # Settings via pydantic-settings
│   │   ├── auth.py             # Firebase JWT verification middleware
│   │   ├── routers/
│   │   │   ├── resume.py       # Resume upload → Cloud Storage
│   │   │   ├── interview.py    # Session CRUD + adaptive question generation
│   │   │   ├── feedback.py     # AI feedback generation
│   │   │   ├── analytics.py    # Progress and insights aggregation
│   │   │   ├── questions.py    # User question bank
│   │   │   ├── speech.py       # Cloud Speech-to-Text proxy
│   │   │   └── email.py        # Resend welcome email
│   │   └── services/
│   │       ├── firestore.py    # Firestore async client helpers
│   │       ├── storage.py      # Cloud Storage helpers
│   │       ├── resume_parser.py      # Resume parsing/extraction
│   │       ├── jd_parser.py          # Job description parsing/extraction
│   │       ├── matching_engine.py    # Resume ↔ JD matching/analysis
│   │       ├── question_generator.py # LLM-powered question generation
│   │       ├── followup_handler.py   # Dynamic follow-up generation
│   │       ├── feedback_generator.py # Structured feedback generation
│   │       └── interview_engine.py   # Real-time interview orchestration + difficulty adaptation
│   ├── Dockerfile
│   └── requirements.txt
├── src/                        # React frontend
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── landing/            # Landing page sections
│   │   └── layout/             # Navbar, shell
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Firebase Auth state
│   │   └── InterviewContext.tsx
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── InterviewSetup.tsx
│   │   ├── ChatInterviewSession.tsx
│   │   ├── InterviewResults.tsx
│   │   ├── Progress.tsx
│   │   ├── Insights.tsx
│   │   └── PracticeQuestions.tsx
│   ├── services/
│   │   ├── apiClient.ts              # Typed HTTP client (attaches Firebase JWT)
│   │   ├── deepgramTranscriptionService.ts  # Proxies audio to backend /api/speech/transcribe
│   │   ├── emailService.ts           # Calls backend /api/email/welcome
│   │   ├── questionDatabaseService.ts
│   │   └── userQuestionBankService.ts
│   └── utils/
│       ├── env.ts              # getApiUrl(), getGa4MeasurementId()
│       └── firebase.ts         # Firebase app + auth initialization
├── public/
├── cloudbuild.yaml             # CI/CD: Docker build → Cloud Run → Firebase Hosting
├── firebase.json               # Firebase Hosting config + SPA rewrites
├── .firebaserc                 # Firebase project binding
├── DEPLOYMENT.md               # Complete GCP deployment guide (start here)
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- A running backend (local or Cloud Run)

### 1. Clone and install frontend dependencies

```bash
git clone https://github.com/nirajmehta960/amplify-interview.git
cd amplify-interview
npm install
```

### 2. Configure environment

Create `.env.local` at the project root (never commit this file):

```bash
# Backend URL — use your Cloud Run URL or http://localhost:4000 for local dev
VITE_API_URL=http://localhost:4000

# Firebase Web App config (from Firebase Console → Project settings → Your apps)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef

# Optional — Google Analytics 4 Measurement ID
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Run the backend locally

```bash
cd backend

# Create and activate virtualenv
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Set required env vars (or create backend/.env)
export GCP_PROJECT_ID=your-project-id
export GCS_BUCKET_NAME=amplify-interview-uploads
export OPENAI_API_KEY=sk-...
export RESEND_API_KEY=re_...
export FRONTEND_URL=http://localhost:3000

uvicorn app.main:app --reload --port 4000
```

Backend is available at `http://localhost:4000`. Interactive docs at `http://localhost:4000/docs`.

### 4. Run the frontend

```bash
# From project root
npm run dev
```

Frontend is available at `http://localhost:3000`.

---

## Deployment

Full GCP deployment from scratch is documented in [DEPLOYMENT.md](DEPLOYMENT.md).

High-level steps:

1. Enable GCP APIs (Cloud Run, Firestore, Storage, Speech, Secret Manager, etc.)
2. Set up Firebase (Auth, Firestore, Hosting, Web App registration)
3. Create Cloud Storage bucket + Artifact Registry
4. Store secrets in Secret Manager
5. Grant IAM roles to Cloud Build and Cloud Run service accounts
6. Build and deploy backend Docker image to Cloud Run
7. Build and deploy frontend to Firebase Hosting
8. Connect GitHub repo to Cloud Build — every push to `main` auto-deploys both

### CI/CD Pipeline (`cloudbuild.yaml`)

```
push to main
     │
     ├─► docker build ./backend → push to Artifact Registry
     │
     ├─► gcloud run deploy amplify-interview-backend
     │
     ├─► npm ci
     │
     ├─► npm run build   (reads VITE_* from Secret Manager)
     │
     └─► firebase deploy --only hosting
```

---

## API Overview

The FastAPI backend exposes these router groups (all under `/api`):

| Router | Endpoints | Description |
|---|---|---|
| `/api/resume` | `POST /upload` | Upload resume PDF to Cloud Storage |
| `/api/interview` | `POST /start`, `POST /{id}/respond`, `GET /sessions` | Adaptive interview sessions |
| `/api/feedback` | `GET /{session_id}` | AI-generated feedback per session |
| `/api/analytics` | `GET /overview`, `GET /progress`, `GET /skills` | Progress and insights |
| `/api/questions` | `GET /`, `POST /`, `DELETE /{id}` | User question bank |
| `/api/speech` | `POST /transcribe` | Cloud Speech-to-Text proxy |
| `/api/email` | `POST /welcome` | Send welcome email via Resend |
| `/health` | `GET /` | Health check |

All endpoints (except `/health`) require a Firebase ID token in the `Authorization: Bearer <token>` header.

---

## Security

- **No client-side secrets** — all API keys (OpenAI, Resend) are stored in Secret Manager and accessed only by the Cloud Run backend
- **Firebase JWT verification** — every backend request validates the Firebase ID token; Firestore is locked to deny all direct client reads/writes
- **HTTPS everywhere** — Cloud Run and Firebase Hosting both terminate TLS
- **Least-privilege IAM** — Cloud Run SA has only the roles it needs (Firestore user, Storage object admin, Speech client, Secret accessor)

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

---

*Made with passion for better interview preparation.*
