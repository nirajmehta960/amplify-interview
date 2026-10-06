# Frontend Phase 8 — Results, Charts, and Known Gaps

**What this covers:** data visualization, animation patterns, and an honest inventory of what isn't finished.
**Files:** `src/pages/{InterviewResults,Dashboard,Progress,Insights,SessionReview,AnalyticsDashboard,ModernAnalyticsDashboard,ProcessingInterview}.tsx`
**You need to know:** Recharts, framer-motion

---

## Recharts

Used in four files, always wrapped in `ResponsiveContainer`:

```tsx
<ResponsiveContainer width="100%" height={300}>
  <RadarChart data={communicationScores}>
    <PolarGrid />
    <PolarAngleAxis dataKey="dimension" />
    <PolarRadiusAxis domain={[0, 100]} />
    <Radar dataKey="score" stroke="hsl(var(--primary))"
           fill="hsl(var(--primary))" fillOpacity={0.5} />
  </RadarChart>
</ResponsiveContainer>
```

**`ResponsiveContainer` needs a sized parent.** It measures its container, so a parent with no explicit height collapses the chart to zero — the single most common Recharts problem.

**Charts read the same design tokens as everything else** — `hsl(var(--primary))` rather than a hex literal. That is what keeps them consistent with the UI, and it is why the token system in Phase 2 stores raw HSL components.

A naming collision worth knowing:

```tsx
import { Tooltip as RechartsTooltip, BarChart as ReBarChart } from "recharts";
```

Recharts and shadcn/ui both export `Tooltip`. Aliasing on import is the fix. (There is a shadcn `ui/chart.tsx` wrapper in the repo, but pages import Recharts directly.)

Chart choice by question:
- **Radar** — communication scores across seven dimensions (shape at a glance)
- **Bar** — per-question scores (compare discrete items)
- **Area** — score over time (trend)

---

## framer-motion

Used in ~30 files. One idiom dominates:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.1 }}
>
```

Mount fade-and-rise, with a per-index delay to stagger mapped lists. Applied consistently across dashboard cards, landing sections, and results panels.

The distinctive uses are all in the chat (Phase 6): `AnimatePresence initial={false}` around the message list, the infinite-loop typing dots, and the pop-in send button.

`design-system.ts` exports shared variants (`motion.fadeIn`, `slideUp`, `stagger`), but most pages inline their own — so the presets are largely unused.

⚠️ **No `prefers-reduced-motion` handling anywhere.** Users with vestibular sensitivity get the full animation set. framer-motion has `useReducedMotion()` built in; wiring it into the shared variants would be a small, worthwhile accessibility fix.

---

## InterviewResults — the model page

The best-implemented data page. It:

1. Fetches feedback via `feedbackApi.get(sessionId)`, and calls `.generate()` if none exists yet
2. Fetches the transcript via `interviewApi.getMessages(sessionId)`
3. Renders overall score, readiness level, a radar of communication scores, strengths/improvements, and a per-question breakdown

The generate-on-miss pattern is worth noting: feedback is produced by an expensive `gpt-4o` call (backend Phase 9), so it is generated once on first view rather than eagerly at session end.

---

## ⚠️ What's mocked

Four pages render hardcoded data. They look finished and are not.

### `SessionReview.tsx` — fully mocked

Route `/review/:sessionId`. A rich player-style UI — video player, transcript with timestamps, emotion timeline, gesture analysis, bookmarks — built entirely on:

```tsx
const mockSessionData = { videoUrl: "/api/video/sample.mp4", transcript: [...], emotions: [...] };
useEffect(() => { setSessionData(mockSessionData); }, []);
```

It imports nothing from `apiClient`. Note it also depends on two things that **don't exist**: recorded interview video (Phase 7) and emotion/gesture analysis (no backend endpoint). This is a design prototype, not a wired feature.

### `AnalyticsDashboard.tsx` and `ModernAnalyticsDashboard.tsx` — mocked

Both build local `mockData` objects. `AnalyticsDashboard` wraps it in a `setTimeout` to simulate loading; `ModernAnalyticsDashboard` references a module-level constant directly in JSX.

The frustrating part: **the real endpoints already exist and work.** `analyticsApi.getOverview()`, `.getProgress()`, and `.getSkills()` are implemented on both sides and used successfully by `Dashboard.tsx`, `Progress.tsx`, and `Insights.tsx`. These two pages could be wired up in an afternoon.

### `AnalyticsDemo.tsx`

A header wrapper around `ModernAnalyticsDashboard` at `/demo/analytics` — intentionally a showcase, so mock data is defensible here.

### `ProcessingInterview.tsx` — a stub

```tsx
export default function ProcessingInterview() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/dashboard", { replace: true }); }, [navigate]);
  return null;
}
```

Fourteen lines. The `/processing` route is a redirect.

The gap it leaves: after the last answer, `ChatInterviewSession` waits 3 seconds and navigates **straight to `/results/:id`**, where feedback generation begins on load. That's an expensive `gpt-4o` call with no interstitial, so the results page hangs on a spinner. Restoring a real processing screen — or a skeleton on the results page — is the fix.

---

## Complete gap inventory

### Mocked or stubbed
| Item | File |
|---|---|
| Session review — entirely mock data | `SessionReview.tsx` |
| Analytics dashboard — mock data | `AnalyticsDashboard.tsx` |
| Modern analytics — mock data | `ModernAnalyticsDashboard.tsx` |
| Processing screen — 14-line redirect | `ProcessingInterview.tsx` |
| Google sign-in — alerts, then mock login | `AuthContext.tsx` |

### Real bugs
| Bug | Impact | Phase |
|---|---|---|
| Session ID not in the URL | Refresh mid-interview starts a new session | 6 |
| No token refresh | 401s after 1 hour | 4 |
| No `AbortSignal` on fetches | setState-after-unmount warnings | 5 |
| `deepgramTranscriptionService` defaults to port 8080 | Wrong server in local dev | 5 |
| Mock auth triggers on missing config | A build without the client ID accepts any password | 4 |

### Dead code
| Item | Note |
|---|---|
| `components/Hero.tsx`, `Features.tsx`, `HowItWorks.tsx` | Superseded by `components/landing/*` |
| `components/landing/CTASection.tsx` | Never imported |
| `services/unifiedTranscriptionService.ts` | Zero importers |
| `services/questionDatabaseService.ts` | Zero importers |
| `services/aiAnalysisPrompts.ts` | Zero importers |
| `services/rateLimiter.ts` | Zero importers |
| Video recording half of `useVideoRecording` | ~300 lines never invoked |
| `.dark` token block | Complete palette, never activated |
| `design-system.ts` colors | Reference non-existent Tailwind classes |
| `@ffmpeg/*`, `html2canvas`, `jspdf` | Installed, unused (`firebase` was removed 2026-08-10) |

### Architectural improvements
| Improvement | Payoff |
|---|---|
| Adopt TanStack Query (already installed) | Caching, dedup, retry, abort — removes ~15 lines per fetch |
| Adopt react-hook-form (already installed) | Inline per-field errors instead of first-error toasts |
| Layout route with `<Outlet />` | Consistent navigation; sidebar keeps state |
| `strict: true` in tsconfig | Catches null/undefined bugs at compile time |
| Add a `typecheck` script to CI | `tsc --noEmit` never runs today |
| `prefers-reduced-motion` | Accessibility |
| Consolidate score-colour helpers | Currently duplicated in two files |

---

## If you're picking this up

Highest value first:

1. **Session ID in the URL** — the most user-visible bug.
2. **Token refresh** — sessions silently die after an hour.
3. **Wire the two analytics dashboards** to endpoints that already work.
4. **Decide on video** — wire it end to end or delete the dead half.
5. **Delete the dead files** — ten files and four dependencies, zero risk.
6. **Turn on `strict`** — largest effort, largest long-term payoff.

Items 3 and 5 are close to free. Item 1 is an afternoon.

---

## 🧠 Check your understanding

1. Why does `ResponsiveContainer` collapse to zero height sometimes?
2. Why do charts use `hsl(var(--primary))` instead of a hex value?
3. Why alias Recharts' `Tooltip` on import?
4. Why is feedback generated on first view rather than at session end?
5. What two non-existent features does `SessionReview.tsx` assume?
6. What does the missing processing screen actually cost the user?
7. Why would adopting the already-installed TanStack Query remove more code than it adds?

---

**Back to:** [Frontend index](README.md) · **See also:** [Backend plan](../backend_plan/README.md) · [Deployment plan](../deployment_plan/README.md)
