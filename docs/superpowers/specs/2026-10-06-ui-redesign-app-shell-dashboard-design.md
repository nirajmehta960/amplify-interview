# UI Redesign — Sub-project 3: App Shell + Dashboard

**Date:** 2026-10-06
**Status:** Design approved in brainstorming; awaiting written-spec review
**Branch:** `feature/ui-redesign` (uncommitted, per the user's "commit after the full UI" instruction)
**Builds on:** `2026-10-05-ui-redesign-foundation-landing-design.md` (tokens, electric-blue accent `#3575EE`, score scale 45/78, no fabricated claims)

> **Amendment 2026-10-06 — after the final review.**
> - **Trend:** the backend only computes `performance_trend` from **6+ scored** interviews (`routers/analytics.py` compares the latest 5 with the 5 before). `trendLabel(trend, scored)` therefore says "Not enough data" below 6 *scored* interviews, where `scored = overview.recent_scores.length` — not "2 completed" as §4.2 says.
> - **Average:** shows "—" until at least one interview is *scored*. A completed interview has no score until its results page generates feedback.
> - **Error state:** `useDashboardData` also returns `sessionsError` / `analyticsError`. Sections render a `LoadError` panel with "Try again" instead of the empty or zero state, so a failed request never looks like a new account. Refresh now reports failure instead of always saying "Refreshed".
> - **Chart labels:** "Strong (78+)" / "Needs work (45 and below)", subtitle "Each point is one interview's overall score." §4.3's "Easier below / Harder above" implied the next interview gets harder, but difficulty adapts *within* an interview.
> - **Accessibility:** the rail's links sit in `<nav aria-label="Main">`, and the mobile sheet is titled "Navigation".

## 1. Intent

Every signed-in page shares one layout, and the dashboard is rebuilt on real data.

**Today:** the sidebar exists only on Dashboard and Interview Setup. Practice Questions, Progress and Insights each draw their own "Back to Dashboard" header. Results and the mocked analytics pages have no navigation. The dashboard's top bar carries a search box that searches nothing, a bell whose unread dot is always lit, and Help/Settings links to `#`. Its "Improvement" tile invents a percentage (`"improving"` → "+15%"), and its readiness colours use 85/70 cut-offs that disagree with the shared 45/78 scale.

**Success:**
- One layout route wraps every protected page except the live interview. Navigation is identical everywhere and the sidebar does not remount between pages.
- The live interview (`/interview/session`) stays full-screen ("focus mode").
- The dashboard shows only numbers the backend returns. It has loading, empty and error states, and every score is coloured by `scoreBand`.
- No dead controls remain in the shell.
- Gates: `npm test` passes; typecheck 0 errors; lint ≤ 78 problems (current baseline); `npm run build` passes.

## 2. Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Live interview | Focus mode: protected, but outside the shell |
| Shell style | **C · Dark rail**: navy sidebar (`#0A0F1C`, the landing hero's ink) beside the cream workspace |
| Mechanism | A React Router **layout route** (`ProtectedRoute` → `AppShell` → `<Outlet/>`) on the existing shadcn `Sidebar` primitive, restyled through `--sidebar-*` tokens |
| Top bar | None on desktop. Each page has a `PageHeader` (title, subtitle, actions). Phones get a slim top bar (brand + menu trigger). |
| Dead controls | Removed: search box, notification bell, "Help & Support", "Settings" |
| Account | Name, email and **Sign out** live at the foot of the rail |
| Mock analytics routes | Inside the shell, so they are navigable, but **not** in the nav. Their insides are untouched until sub-project 5. |
| Dashboard content | Header + welcome/status + 4 real stat tiles + recent-scores chart + "Focus next" + recent interviews |

## 3. Shell

### 3.1 Routing (`src/App.tsx`)

```tsx
<Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/dashboard/analytics" element={<AnalyticsDashboard />} />
  <Route path="/dashboard/analytics/modern" element={<ModernAnalyticsDashboard />} />
  <Route path="/demo/analytics" element={<AnalyticsDemo />} />
  <Route path="/dashboard/progress" element={<Progress />} />
  <Route path="/dashboard/insights" element={<Insights />} />
  <Route path="/dashboard/practice-questions" element={<PracticeQuestions />} />
  <Route path="/interview/setup" element={<InterviewSetup />} />
  <Route path="/processing" element={<ProcessingInterview />} />
  <Route path="/results/:sessionId" element={<InterviewResults />} />
  <Route path="/review/:sessionId" element={<SessionReview />} />
</Route>
<Route path="/interview/session" element={<ProtectedRoute><ChatInterviewSession /></ProtectedRoute>} />
```

Paths are unchanged, so no link anywhere breaks. `ProtectedRoute` is unchanged: it still takes `children`, shows its loader, and redirects to `/auth/signin`.

### 3.2 Components (`src/components/shell/`)

- **`nav.ts`**: the nav data. Groups: *Practice* (Dashboard `/dashboard`, New interview `/interview/setup`, Practice questions `/dashboard/practice-questions`) and *Analytics* (Progress `/dashboard/progress`, Insights `/dashboard/insights`). Each item has a lucide icon.
- **`AppSidebar.tsx`**: replaces `src/components/layout/AppSidebar.tsx`, which is deleted.
  - Built on `Sidebar collapsible="icon"`.
  - Header: brand mark (blue tile + mic + "Amplify Interview"), linking to `/`.
  - Nav: `NavLink` with `end`. The active item gets `aria-current="page"` and a blue-tinted fill.
  - Footer: avatar initial, display name and email, a **Sign out** button, and the collapse toggle (`SidebarTrigger`).
  - Sign-out calls `signOut()` and then `navigate("/", { replace: true })`, even if `signOut` throws, as today.
  - Collapsed, it shows icons with tooltips (`SidebarMenuButton tooltip`).
- **`AppShell.tsx`**: `SidebarProvider` › `AppSidebar` + `SidebarInset`. The inset holds:
  - the mobile top bar (`md:hidden`: trigger + brand);
  - `<main id="main">` wrapping `<Outlet/>`, with a skip link before it.
  - The inset background is the cream `--background`.
- **`PageHeader.tsx`**: `{ title: string; subtitle?: ReactNode; actions?: ReactNode }`. Renders an `h1` (`text-display-3`-scale), the muted subtitle and right-aligned actions, wrapping on phones.

### 3.3 Dark rail tokens (`src/index.css`, `:root`)

The `--sidebar-*` variables are read only by the shadcn sidebar, so they are set globally:

| Token | Value | Use |
|---|---|---|
| `--sidebar-background` | `#0A0F1C` | rail ground |
| `--sidebar-foreground` | `#BCC8E0` | nav labels (≈ 11:1 on the ground) |
| `--sidebar-primary` | `#3575EE` | brand tile, avatar |
| `--sidebar-primary-foreground` | `#FFFFFF` | |
| `--sidebar-accent` | `#16233F` | hover / active fill |
| `--sidebar-accent-foreground` | `#FFFFFF` | active label |
| `--sidebar-border` | `#1C2438` | hairlines |
| `--sidebar-ring` | `#6B9BFF` | focus ring on navy |

Group labels use `#8E9DBD` (≈ 6.9:1). On phones the shadcn sidebar renders as a Sheet, which reads the same tokens.

### 3.4 Page trims (layout only — page insides wait for sub-projects 4–5)

Each page under the shell drops its own outer chrome, keeping everything inside:

- **Dashboard:** rebuilt (§4).
- **InterviewSetup:** remove its `SidebarProvider`/`AppSidebar`/header wrapper. Its "Back" button and the "Personalized AI Interview" label move into a `PageHeader`.
- **PracticeQuestions, Progress, Insights:**
  - Remove the sticky "Back to Dashboard" header and the `min-h-screen` root.
  - The existing page title becomes a `PageHeader`.
  - The loading branches keep their spinner, without `min-h-screen`.
- **InterviewResults:** remove the `min-h-screen` root. The not-found "Go Back" stays.
- **Mock analytics pages, SessionReview:** no edits. They render inside the shell as they are.
- **ChatInterviewSession:** no edits (focus mode).

## 4. Dashboard

### 4.1 Data (`src/components/dashboard/useDashboardData.ts`)

The existing fetch logic moves **verbatim** out of `Dashboard.tsx`:
- `userApi.getProfile` (with the auth-context fallback);
- `interviewApi.listSessions(20)`;
- `analyticsApi.getOverview` + `getProgress`;
- refetch on `visibilitychange` / `focus`;
- the "Error Loading Sessions" toast.

New: a `loading` flag that is true until the first `fetchAll` settles.

Returns `{ loading, profile, sessions, overview, progress }`, with the types widened to what the backend returns:
- `OverviewData`: `total_sessions`, `completed_sessions`, `average_score`, `highest_score`, `performance_trend`, `recent_scores`
- `ProgressData`: `score_timeline`, `top_strengths`, `top_improvements` (`{ item: string; count: number }[]`)

### 4.2 Pure helpers (`src/components/dashboard/format.ts`)

- `practiceStreak(timeline): number` — the existing streak algorithm, moved unchanged. Returns days as a number.
- `trendLabel(trend: string, completed: number): { label: "Improving" | "Steady" | "Declining" | "Not enough data"; direction: "up" | "flat" | "down" }`
  - Fewer than 2 completed interviews → "Not enough data" (flat). The backend defaults `performance_trend` to `"consistent"` even with zero sessions (`routers/analytics.py`), so the raw value alone would tell a new user they are "Steady".
  - Otherwise maps the backend's values: `improving` → up; `consistent` → flat; `declining` → down; anything else → "Not enough data".
  - **No percentages.**
- `statusLine(sessions, overview): string`
  - Latest completed session with a score → "Your last interview scored {n} · {verdict}". The verdict comes from `scoreBand`: high "Strong answer", mid "Solid, with room to grow", low "Needs work".
  - Otherwise → "No completed interviews yet."
- `displayName(profile, user): string` — the existing fallback chain.

### 4.3 Sections (`src/components/dashboard/`, presentational, props-only)

1. **`PageHeader`:** "Dashboard" / "Your practice at a glance" / primary **New interview** (`/interview/setup`).
2. **`WelcomeCard`:** white panel, "Welcome back, {name}" + `statusLine`. With zero sessions it shows **Get started** instead, three numbered steps (add your résumé and the job → take an adaptive interview → review your scored feedback) and a **Start your first interview** button.
3. **`StatTiles`:** four tiles:
   - Interviews completed (`completed_sessions`)
   - Average score (`Math.round(average_score)`, text in `SCORE_COLORS[band].text`, "—" when 0 sessions)
   - Trend (`trendLabel`, arrow icon by direction)
   - Practice streak (`{n} day(s)`)
4. **`ScoreTrend`:**
   - A Recharts `LineChart` of the last 10 `score_timeline` points, in `#3575EE`, Y axis fixed at 0–100.
   - Dashed reference lines at 45 and 78, labelled "Easier below" / "Harder above".
   - Hidden when there are fewer than 2 points; the card then says "Complete two interviews to see your trend."
5. **`FocusNext`:**
   - Up to 3 `top_improvements[].item`, plus a link "Practise these" → `/dashboard/practice-questions`.
   - With none: "Your improvement themes appear after your first completed interview."
6. **`RecentInterviews`:**
   - Rows of mode, date (`date-fns`), `question_count` questions, status, and a score pill (`scoreBand` colours, "—" if unscored).
   - As today, every row opens `/results/:id` (the results page generates feedback for a session that has none yet). Each row is now a real link, so it is keyboard- and middle-click-reachable; today it is a hover-only icon button.
  - The header keeps today's **Refresh** button (refetches sessions + analytics, same toasts), now labelled for screen readers.
   - Empty → "No interviews yet" + New interview button.

**Loading:** while `loading`, each section renders a skeleton (`Skeleton` from shadcn) of its final shape — never zeros.

**Removed:**
- the fabricated "Improvement %";
- the separate "Interview Readiness" card (it duplicated the average);
- the 85/70 readiness thresholds;
- the search, bell, Help and Settings controls.

## 5. Testing

Vitest + Testing Library, with auth and APIs mocked.

- **`format.test.ts`:**
  - streak: consecutive days, a gap, today-less timeline, empty;
  - `trendLabel` for every backend value, unknown values, and fewer than 2 completed interviews;
  - `statusLine` with scored, unscored and no sessions;
  - asserts no `%` anywhere in the trend output.
- **`dashboard.test.tsx`:**
  - populated data renders the four tiles with real numbers and the average coloured per `scoreBand`;
  - the empty state shows Get started;
  - loading shows skeletons and no "0";
  - every recent row links to `/results/:id` and Refresh refetches;
  - "Focus next" lists the improvements.
- **`shell.test.tsx`:**
  - the shell renders nav and outlet;
  - the active link has `aria-current="page"`;
  - Sign out calls `signOut` and navigates to `/`;
  - no search input or bell is rendered;
  - `/interview/session` renders without the sidebar while `/dashboard` renders with it (rendered through the real `App` route tree under `MemoryRouter`).
- **`scripts/screenshot-landing.mjs`:**
  - adds a populated dashboard (API routes fulfilled with fixtures), an empty dashboard, and the collapsed rail at 1440 and 375;
  - adds Practice Questions, Progress, Insights, Setup and Results inside the shell;
  - overflow and page-error checks apply to the dashboard.

## 6. Out of scope

- Redesigning the insides of Setup, Practice Questions, Progress, Insights and Results (sub-projects 4–5).
- The mock analytics pages' contents.
- Dark mode.
- The blue logo SVG redraw. The rail uses the brand mark; the old SVGs are unused by the shell.
- Backend changes.
- A real search, notifications, help or settings — these would be new features, not redesign.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Removing per-page wrappers breaks a page's internal layout (e.g. relied on `min-h-screen` centring) | Screenshot pass of every shelled page at 1440/375; loading spinners re-centred in the content area |
| shadcn `Sidebar` keyboard shortcut (Cmd/Ctrl+B) collides with an editor field | It is the primitive's default and only fires outside inputs; documented, not changed |
| Unknown `performance_trend` strings from the backend | `trendLabel` falls back to "Not enough data" and is tested |
| Refetch-on-focus floods the API | Behaviour unchanged from today; moved verbatim |
