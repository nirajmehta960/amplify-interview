# Frontend — How It's Built

The Amplify Interview client is a **React 18 + TypeScript + Vite** single-page app: a marketing landing page, Cognito auth, a résumé/JD upload wizard, a real-time interview chat, and results/analytics dashboards.

This folder documents *how it is actually implemented*, in the order you would build it — the real files, the real patterns, and what you need to know to write each layer.

> **Honest documentation.** These docs describe the code as it is, including installed-but-unused libraries, dead design tokens, and pages that render hardcoded data. Where something is unfinished, it says so.

---

## Tech stack you need to know

| Layer | Technology | Notes |
|---|---|---|
| **Framework** | React 18.3 | Function components + hooks only |
| **Language** | TypeScript 5.8 | ⚠️ `strict: false` — see Phase 1 |
| **Build** | Vite 5.4 | Dev server on **port 3000** |
| **Styling** | Tailwind CSS 3.4 | HSL CSS-variable token system |
| **Components** | shadcn/ui + Radix UI | ~45 primitives copied into `src/components/ui/` |
| **Routing** | react-router-dom 6.30 | |
| **Animation** | framer-motion 12 | Used in ~30 files |
| **Charts** | Recharts 2.15 | Radar, Bar, Area |
| **Validation** | Zod 3.25 | Used imperatively, not via resolvers |
| **Icons** | lucide-react | |
| **Toasts** | sonner + shadcn toast | Both are mounted |
| **Fonts** | @fontsource Inter + Outfit | Self-hosted |
| **Media** | MediaRecorder API | Native, no library |

**Installed but unused** — worth knowing before you assume they're load-bearing:

| Package | Reality |
|---|---|
| `@tanstack/react-query` | Provider is mounted; **zero** `useQuery`/`useMutation` calls exist |
| `react-hook-form` + `@hookform/resolvers` | **Zero** `useForm` calls; auth pages use `useState` + `schema.parse()` |
| `next-themes` | Only inside `ui/sonner.tsx`; no `ThemeProvider` in the tree |
| `@ffmpeg/ffmpeg`, `html2canvas`, `jspdf` | Left from removed features |

**Concepts you must be comfortable with:** React hooks, TypeScript generics, the Fetch API, JWTs in the browser, CSS custom properties, and the MediaRecorder API.

---

## Architecture

```
main.tsx
  └── App.tsx
        HelmetProvider → QueryClientProvider → TooltipProvider → [Toaster, Sonner]
          └── BrowserRouter
                └── AuthProvider          ← Cognito IDP called directly via fetch
                      └── Routes
                            ├── public:    / · /auth/*
                            └── ProtectedRoute
                                  ├── /dashboard · /dashboard/{analytics,progress,insights,practice-questions}
                                  ├── /interview/setup → /interview/session
                                  └── /results/:id · /review/:id

  services/apiClient.ts   ← one fetch wrapper + typed per-domain objects
        │ Authorization: Bearer <localStorage amplify_id_token>
        ▼
  FastAPI backend
```

**Data flow is deliberately plain:** no Redux, no Zustand, no global store. Server state is fetched with `useState` + `useEffect` per page; the only shared client state is auth, in a Context.

---

## The phases

| # | Phase | What you learn |
|---|---|---|
| 1 | [Tooling & build](PHASE_01_tooling.md) | Vite, path aliases, TS config, ESLint flat config |
| 2 | [Design system](PHASE_02_design_system.md) | Tailwind tokens, HSL variables, shadcn/ui, `cn()` |
| 3 | [App shell & routing](PHASE_03_app_shell.md) | Provider nesting, React Router, route guards |
| 4 | [Authentication](PHASE_04_auth.md) | Cognito IDP over raw fetch, token storage, Zod validation |
| 5 | [API client](PHASE_05_api_client.md) | Typed fetch wrapper, error handling, FormData uploads |
| 6 | [The interview chat](PHASE_06_chat_ui.md) | Optimistic updates, auto-scroll, AnimatePresence |
| 7 | [Media capture & voice](PHASE_07_media_capture.md) | MediaRecorder, dual recorders, codec negotiation |
| 8 | [Results, charts & gaps](PHASE_08_results_and_gaps.md) | Recharts, framer-motion, and what's still mocked |

Phases 5–7 are where the interesting engineering is.

---

## Running it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Root `.env`:
```bash
VITE_API_URL=http://localhost:4000
VITE_AWS_REGION=us-east-1
VITE_AWS_COGNITO_CLIENT_ID=<client-id>    # omit to run in MOCK AUTH mode
```

**Leaving `VITE_AWS_COGNITO_CLIENT_ID` unset enables mock auth** — any email/password signs you in and stores the literal token `mock-user-token`, which the backend accepts while `ENVIRONMENT=development`. That is the fastest way to work on UI without a Cognito pool.

Vite only reads `VITE_`-prefixed variables, and only at server start — **restart after editing `.env`**.

---

## What's real vs. mocked

| Page | Status |
|---|---|
| `ChatInterviewSession.tsx` | ✅ Fully real — `interviewApi` |
| `Dashboard.tsx` | ✅ Real — `userApi`, `interviewApi`, `analyticsApi` |
| `InterviewSetup.tsx` | ✅ Real — `resumeApi` |
| `InterviewResults.tsx` | ✅ Real — `interviewApi` + `feedbackApi` |
| `Progress.tsx`, `Insights.tsx` | ✅ Real — `analyticsApi` |
| `PracticeQuestions.tsx` | ✅ Real — via `userQuestionBankService` |
| `SessionReview.tsx` | ❌ **Fully mocked** — hardcoded transcript, emotions, gestures |
| `AnalyticsDashboard.tsx` | ❌ **Mocked** — fake data behind a `setTimeout` |
| `ModernAnalyticsDashboard.tsx` | ❌ **Mocked** — module-level `mockData` |
| `AnalyticsDemo.tsx` | ❌ Wrapper around the mocked dashboard |
| `ProcessingInterview.tsx` | ⚠️ **14-line stub** — immediately redirects to `/dashboard` |

Detailed in [Phase 8](PHASE_08_results_and_gaps.md).

---

## Related docs

- [`../backend_plan/`](../backend_plan/README.md) — the FastAPI service this talks to
- [`../deployment_plan/`](../deployment_plan/README.md) — shipping it to S3 + CloudFront

**Start:** [Phase 1 — Tooling & build](PHASE_01_tooling.md)
