# UI Redesign — App Shell + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap every signed-in page (except the live interview) in one dark-rail layout, and rebuild the dashboard on real data only.

**Architecture:**
- A React Router layout route, `ProtectedRoute` › `AppShell` › `<Outlet/>`, built on the existing shadcn `Sidebar` primitive and recoloured through `--sidebar-*` tokens.
- Routes move out of `App.tsx` into `AppRoutes.tsx`, so the route tree is testable under `MemoryRouter`.
- The dashboard's fetching moves verbatim into `useDashboardData()`. Its UI becomes props-only section components, plus pure helpers in `format.ts`.

**Tech Stack:** React 18, TypeScript (loose), react-router-dom 6, shadcn/ui (`Sidebar`, `Skeleton`, `Button`), Recharts 2, date-fns 3, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-06-ui-redesign-app-shell-dashboard-design.md` (it builds on `2026-10-05-ui-redesign-foundation-landing-design.md`).

## Global Constraints

- npm only. **No new dependencies.**
- **No commits.** The user asked to commit once, after the full UI change. Every gate still runs per task.
- Gates per task:
  - `npm test` passes;
  - `npm run typecheck` reports 0 errors;
  - `npx eslint .` reports **≤ 78 problems**;
  - `npm run build` passes.
- Accent: electric blue `--accent` `#3575EE` / `--primary` `#2A5FD1`. Never hardcode the accent in components; use tokens (`bg-primary`, `text-accent`, `bg-sidebar*`, `SCORE_COLORS`).
- Scores are coloured only through `scoreBand` / `SCORE_COLORS` (45/78). No invented numbers or percentages.
- Copy honesty: no fabricated counts, ratings, testimonials or dead controls. Search, the bell, and Help/Settings are removed, not restyled.
- URLs are unchanged.
- `/interview/session` stays outside the shell (focus mode). `ChatInterviewSession.tsx` is not edited.
- Import `cn` from `@/lib/utils` only.
- Tests that render the shell must call `mockMatchMedia()`, because `useIsMobile` reads `window.matchMedia`.

## Review Focus

1. **A phone-width visitor opens the nav, taps a link, and the sheet stays open over the new page.** It must close on navigation. → Task 1, test "closes the mobile sheet when a link is chosen".
2. **`signOut()` rejects (network down).** The user must still land on `/`, signed out locally, with no unhandled rejection. → Task 1, test "still leaves when sign-out fails".
3. **The backend returns `performance_trend: "consistent"` for a brand-new user.** The tile must say "Not enough data", not "Steady". → Task 3, `trendLabel` tests.
4. **A session with a malformed `created_at`.** date-fns `format` throws `RangeError` and would blank the dashboard; the row must render with no date. → Task 3, `formatSessionDate` test, and Task 5, `RecentInterviews` test.
5. **A page under the shell still draws its own full-screen chrome** (`min-h-screen` root, "Back to Dashboard" header, a second sidebar), producing a double header or a scroll inside a scroll. → Task 7, `chrome.test.ts`.

---

## File Structure

```
src/index.css                                 --sidebar-* → dark rail values
src/test/tokens.test.ts                       + sidebar token assertions
src/components/shell/
  nav.ts                                      NAV_GROUPS data
  AppSidebar.tsx                              dark rail (brand, nav, account, sign-out, collapse)
  AppShell.tsx                                SidebarProvider + AppSidebar + SidebarInset(<main>) + mobile bar + <Outlet/>
  PageHeader.tsx                              PageHeader, PageContainer
  shell.test.tsx
src/AppRoutes.tsx                             NEW: the route tree (layout route + focus-mode session)
src/App.tsx                                   uses <AppRoutes/>
src/AppRoutes.test.tsx
src/components/dashboard/
  format.ts (+ format.test.ts)                trendLabel, practiceStreak, statusLine, displayName, formatSessionDate
  useDashboardData.ts (+ useDashboardData.test.tsx)
  WelcomeCard.tsx StatTiles.tsx ScoreTrend.tsx FocusNext.tsx RecentInterviews.tsx
  sections.test.tsx
src/pages/Dashboard.tsx                       REWRITE (+ Dashboard.test.tsx)
src/components/layout/AppSidebar.tsx          DELETE
src/pages/{InterviewSetup,PracticeQuestions,Progress,Insights,InterviewResults}.tsx   chrome trims
src/test/chrome.test.ts                       static rule: shelled pages draw no page chrome
scripts/screenshot-landing.mjs                + shell/dashboard captures with API fixtures
```

---

### Task 1: Dark rail tokens and shell components

**Files:** Modify `src/index.css`, `src/test/tokens.test.ts`. Create `src/components/shell/{nav.ts,AppSidebar.tsx,AppShell.tsx,PageHeader.tsx,shell.test.tsx}`.

**Interfaces:**
- Consumes: `useAuth()` → `{ user: { uid, email?, displayName?, photoURL? } | null, signOut(): Promise<void> }`; shadcn `Sidebar*` exports and `useSidebar()` → `{ state, isMobile, setOpenMobile }`.
- Produces:
  - `NAV_GROUPS: { label: string; items: { title: string; url: string; icon: LucideIcon }[] }[]`
  - `AppSidebar()`
  - `AppShell()` (renders `<Outlet/>` inside `<SidebarInset id="main">`)
  - `PageHeader({ title, subtitle?, actions?, className? })`
  - `PageContainer({ children, className? })`

- [ ] **Step 1: Add the sidebar token assertions (failing).** In `src/test/tokens.test.ts`, add rows to the `it.each` list:

```ts
    ["--sidebar-background", "223 47% 7%"],
    ["--sidebar-foreground", "220 37% 81%"],
    ["--sidebar-primary", "219 84% 57%"],
    ["--sidebar-accent", "221 48% 17%"],
    ["--sidebar-accent-foreground", "0 0% 100%"],
    ["--sidebar-border", "223 33% 16%"],
    ["--sidebar-ring", "221 100% 71%"],
```

Run: `npm test -- src/test/tokens.test.ts`. Expected: FAIL on these 7 rows. (`--sidebar-background` is `0 0% 100%` today, and so on.)

- [ ] **Step 2: Set the dark rail tokens.** In `src/index.css`, replace the eight `--sidebar-*` lines in `:root` with:

```css
    /* Dark rail (sub-project 3): the landing hero's navy. Only the shadcn
       sidebar reads these, so setting them globally changes nothing else. */
    --sidebar-background: 223 47% 7%;          /* #0A0F1C */
    --sidebar-foreground: 220 37% 81%;         /* #BCC8E0 — 11:1 on the rail */
    --sidebar-primary: 219 84% 57%;            /* #3575EE */
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 221 48% 17%;             /* #16233F — hover / active fill */
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 223 33% 16%;             /* #1C2438 */
    --sidebar-ring: 221 100% 71%;              /* #6B9BFF — focus on navy */
```

Run: `npm test -- src/test/tokens.test.ts`. Expected: PASS.

- [ ] **Step 3: Write the failing shell test `src/components/shell/shell.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "@/test/browser-mocks";
import { AppShell } from "./AppShell";

const auth = vi.hoisted(() => ({
  user: { uid: "u1", email: "ada@example.com", displayName: "Ada Lovelace" } as null | {
    uid: string;
    email?: string;
    displayName?: string;
  },
  signOut: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function renderShell(path = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
          <Route path="/dashboard/progress" element={<p>Progress content</p>} />
        </Route>
        <Route path="/" element={<p>Landing page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.signOut.mockReset();
  auth.signOut.mockResolvedValue(undefined);
  mockMatchMedia();
  window.innerWidth = 1280;
});

describe("AppShell", () => {
  it("renders the rail navigation around the page", () => {
    renderShell();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    for (const name of ["Dashboard", "New interview", "Practice questions", "Progress", "Insights"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("marks the current page", () => {
    renderShell("/dashboard/progress");
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("shows who is signed in", () => {
    renderShell();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("signs out and returns to the landing page", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("Landing page")).toBeInTheDocument());
  });

  it("still leaves when sign-out fails", async () => {
    auth.signOut.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByText("Landing page")).toBeInTheDocument());
  });

  it("has no dead controls: no search box, bell, help or settings", () => {
    renderShell();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/help & support/i)).toBeNull();
    expect(screen.queryByText(/^settings$/i)).toBeNull();
    expect(document.querySelector('a[href="#"]')).toBeNull();
  });

  it("closes the mobile sheet when a link is chosen", async () => {
    window.innerWidth = 375;
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "Progress" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Progress content")).toBeInTheDocument();
  });
});
```

Add `within` to the `@testing-library/react` import.

Run: `npm test -- src/components/shell`. Expected: FAIL (`./AppShell` does not exist).

- [ ] **Step 4: Create `src/components/shell/nav.ts`**

```ts
import { LayoutDashboard, Lightbulb, MessageSquare, Sparkles, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/** The rail's navigation. Mock analytics routes are deliberately absent (spec §2). */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Practice",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "New interview", url: "/interview/setup", icon: Sparkles },
      { title: "Practice questions", url: "/dashboard/practice-questions", icon: MessageSquare },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Progress", url: "/dashboard/progress", icon: TrendingUp },
      { title: "Insights", url: "/dashboard/insights", icon: Lightbulb },
    ],
  },
];
```

- [ ] **Step 5: Create `src/components/shell/AppSidebar.tsx`**

```tsx
import { LogOut, Mic } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_GROUPS } from "./nav";

/** Shared look for rail rows; the active row is styled from NavLink's aria-current. */
const ROW =
  "h-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&[aria-current=page]]:bg-sidebar-accent [&[aria-current=page]]:font-medium [&[aria-current=page]]:text-sidebar-accent-foreground";

/**
 * The dark rail. NavLink sets aria-current="page" itself; styling keys off that
 * rather than a className function, because SidebarMenuButton's Slot would
 * stringify a function className.
 */
export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const name = user?.displayName || user?.email?.split("@")[0] || "You";

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Leave anyway: the local session is what the user asked to end.
    }
    closeOnMobile();
    navigate("/", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-3 pt-4">
        <Link
          to="/"
          aria-label="Amplify Interview home"
          className="flex items-center gap-2.5 rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-sidebar-primary text-sidebar-primary-foreground">
            <Mic className="size-4" aria-hidden="true" />
          </span>
          <span className="truncate text-[0.9375rem] font-semibold text-white group-data-[collapsible=icon]:hidden">
            Amplify Interview
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[0.6875rem] uppercase tracking-[0.12em] text-sidebar-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} className={ROW}>
                      <NavLink to={item.url} end onClick={closeOnMobile}>
                        <item.icon aria-hidden="true" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground"
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            {user?.email ? <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p> : null}
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" onClick={handleSignOut} className={ROW}>
              <LogOut aria-hidden="true" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarTrigger className="hidden self-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex" />
      </SidebarFooter>
    </Sidebar>
  );
}
```

- [ ] **Step 6: Create `src/components/shell/AppShell.tsx`**

```tsx
import { Mic } from "lucide-react";
import { Link, Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

/**
 * The signed-in layout: dark rail + cream workspace. Mounted once by the layout
 * route, so the rail does not remount between pages. `SidebarInset` renders the
 * <main>. Phones get a slim bar with the menu trigger; the rail becomes a sheet.
 */
export function AppShell() {
  return (
    <SidebarProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset id="main" className="min-w-0 bg-background">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
          <SidebarTrigger aria-label="Open navigation" className="-ml-1" />
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="grid size-7 place-items-center rounded-[8px] bg-accent text-accent-foreground">
              <Mic className="size-3.5" aria-hidden="true" />
            </span>
            Amplify Interview
          </Link>
        </div>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 7: Create `src/components/shell/PageHeader.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The content column every shelled page sits in. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Page title row: the page's only h1, a muted subtitle, and its main actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
```

- [ ] **Step 8: Run the shell tests.** Run: `npm test -- src/components/shell`. Expected: PASS (7 tests). If "closes the mobile sheet" cannot find the dialog, confirm that `useIsMobile` read `window.innerWidth = 375` (set before render) and that the trigger's accessible name is "Open navigation".

- [ ] **Step 9: Gates and ledger.**
  - Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`. Expected: all pass; lint ≤ 78.
  - Append `Task 1: complete (…)` to the ledger.

---

### Task 2: Layout route

**Files:** Create `src/AppRoutes.tsx`, `src/AppRoutes.test.tsx`. Modify `src/App.tsx`.

**Interfaces:**
- Consumes: `AppShell` (Task 1), `ProtectedRoute` (`{ children }`, unchanged), all page default exports.
- Produces: `AppRoutes()`, the full `<Routes>` tree, rendered by `App` inside `BrowserRouter` › `AuthProvider`.

- [ ] **Step 1: Write the failing test `src/AppRoutes.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "@/test/browser-mocks";
import AppRoutes from "./AppRoutes";

const auth = vi.hoisted(() => ({
  user: { uid: "u1", email: "ada@example.com" } as null | { uid: string; email: string },
  loading: false,
  signOut: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

const page = (name: string) => ({ default: () => <p>{name} page</p> });
vi.mock("@/pages/Index", () => page("Index"));
vi.mock("@/pages/SignIn", () => page("SignIn"));
vi.mock("@/pages/SignUp", () => page("SignUp"));
vi.mock("@/pages/ForgotPassword", () => page("ForgotPassword"));
vi.mock("@/pages/ResetPassword", () => page("ResetPassword"));
vi.mock("@/pages/Dashboard", () => page("Dashboard"));
vi.mock("@/pages/AnalyticsDashboard", () => page("AnalyticsDashboard"));
vi.mock("@/pages/ModernAnalyticsDashboard", () => page("ModernAnalyticsDashboard"));
vi.mock("@/pages/AnalyticsDemo", () => page("AnalyticsDemo"));
vi.mock("@/pages/Progress", () => page("Progress"));
vi.mock("@/pages/Insights", () => page("Insights"));
vi.mock("@/pages/PracticeQuestions", () => page("PracticeQuestions"));
vi.mock("@/pages/InterviewSetup", () => page("InterviewSetup"));
vi.mock("@/pages/ChatInterviewSession", () => page("ChatInterviewSession"));
vi.mock("@/pages/ProcessingInterview", () => page("ProcessingInterview"));
vi.mock("@/pages/InterviewResults", () => page("InterviewResults"));
vi.mock("@/pages/SessionReview", () => page("SessionReview"));
vi.mock("@/pages/NotFound", () => page("NotFound"));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1", email: "ada@example.com" };
  mockMatchMedia();
  window.innerWidth = 1280;
});

describe("AppRoutes", () => {
  it.each([
    ["/dashboard", "Dashboard"],
    ["/interview/setup", "InterviewSetup"],
    ["/dashboard/practice-questions", "PracticeQuestions"],
    ["/dashboard/progress", "Progress"],
    ["/dashboard/insights", "Insights"],
    ["/results/abc", "InterviewResults"],
    ["/review/abc", "SessionReview"],
    ["/dashboard/analytics", "AnalyticsDashboard"],
  ])("renders %s inside the shell", (path, name) => {
    renderAt(path);
    expect(screen.getByText(`${name} page`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practice questions" })).toBeInTheDocument();
  });

  it("keeps the live interview in focus mode, without the rail", () => {
    renderAt("/interview/session");
    expect(screen.getByText("ChatInterviewSession page")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Practice questions" })).toBeNull();
  });

  it("still protects the live interview", () => {
    auth.user = null;
    renderAt("/interview/session");
    expect(screen.getByText("SignIn page")).toBeInTheDocument();
  });

  it("still protects shelled pages", () => {
    auth.user = null;
    renderAt("/dashboard");
    expect(screen.getByText("SignIn page")).toBeInTheDocument();
  });

  it("leaves public pages outside the shell", () => {
    renderAt("/");
    expect(screen.getByText("Index page")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Practice questions" })).toBeNull();
  });
});
```

Run: `npm test -- src/AppRoutes.test.tsx`. Expected: FAIL (`./AppRoutes` does not exist).

- [ ] **Step 2: Create `src/AppRoutes.tsx`**

```tsx
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppShell } from "@/components/shell/AppShell";
import AnalyticsDashboard from "@/pages/AnalyticsDashboard";
import AnalyticsDemo from "@/pages/AnalyticsDemo";
import ChatInterviewSession from "@/pages/ChatInterviewSession";
import Dashboard from "@/pages/Dashboard";
import ForgotPassword from "@/pages/ForgotPassword";
import Index from "@/pages/Index";
import Insights from "@/pages/Insights";
import InterviewResults from "@/pages/InterviewResults";
import InterviewSetup from "@/pages/InterviewSetup";
import ModernAnalyticsDashboard from "@/pages/ModernAnalyticsDashboard";
import NotFound from "@/pages/NotFound";
import PracticeQuestions from "@/pages/PracticeQuestions";
import ProcessingInterview from "@/pages/ProcessingInterview";
import Progress from "@/pages/Progress";
import ResetPassword from "@/pages/ResetPassword";
import SessionReview from "@/pages/SessionReview";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";

/**
 * Every route. Signed-in pages share one layout route (dark rail, spec §3.1);
 * the live interview is protected but outside it, so nothing competes with the
 * conversation (focus mode). URLs are unchanged from before the shell.
 */
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth/signin" element={<SignIn />} />
    <Route path="/auth/signup" element={<SignUp />} />
    <Route path="/auth/forgot-password" element={<ForgotPassword />} />
    <Route path="/auth/reset-password" element={<ResetPassword />} />

    <Route
      element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }
    >
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

    <Route
      path="/interview/session"
      element={
        <ProtectedRoute>
          <ChatInterviewSession />
        </ProtectedRoute>
      }
    />

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
```

Note: `ProtectedRoute` redirects to `/auth/signin`, which is in the tree, so the "still protects" tests render the mocked SignIn.

- [ ] **Step 3: Use it in `src/App.tsx`.** Replace every page import and the whole `<Routes>…</Routes>` block with `import AppRoutes from "./AppRoutes";` and `<AppRoutes />`. Keep the providers exactly as they are (`HelmetProvider`, `QueryClientProvider`, `TooltipProvider`, both toasters, `BrowserRouter` with its `future` flags, `AuthProvider`). Remove the now-unused `Routes`/`Route` imports and `ProtectedRoute` import from `App.tsx`.

- [ ] **Step 4: Run the tests.** Run: `npm test -- src/AppRoutes.test.tsx`. Expected: PASS (12 tests).

- [ ] **Step 5: Gates and ledger.** Run: `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`. Expected: all pass; lint ≤ 78.

---

### Task 3: Dashboard helpers

**Files:** Create `src/components/dashboard/format.ts`, `src/components/dashboard/format.test.ts`.

**Interfaces:**
- Consumes: `scoreBand`, `ScoreBand` (`@/lib/score`); `SessionListItem`, `UserProfile` (`@/services/apiClient`).
- Produces:
  - `trendLabel(trend: string | undefined, completed: number): { label: "Improving" | "Steady" | "Declining" | "Not enough data"; direction: "up" | "flat" | "down" }`
  - `practiceStreak(timeline: { date: string }[] | undefined, today?: Date): number`
  - `VERDICT: Record<ScoreBand, string>`
  - `statusLine(sessions: SessionListItem[]): string`
  - `displayName(profile: UserProfile | null, user: { displayName?: string | null; email?: string | null } | null): string`
  - `formatSessionDate(iso: string): string`

- [ ] **Step 1: Write the failing test `src/components/dashboard/format.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import type { SessionListItem } from "@/services/apiClient";
import { displayName, formatSessionDate, practiceStreak, statusLine, trendLabel } from "./format";

const session = (over: Partial<SessionListItem>): SessionListItem => ({
  session_id: "s",
  status: "completed",
  mode: "behavioral",
  created_at: "2026-10-01T10:00:00Z",
  question_count: 8,
  ...over,
});

describe("trendLabel", () => {
  it("says not enough data below two completed interviews, whatever the backend says", () => {
    expect(trendLabel("consistent", 0)).toEqual({ label: "Not enough data", direction: "flat" });
    expect(trendLabel("improving", 1)).toEqual({ label: "Not enough data", direction: "flat" });
  });

  it.each([
    ["improving", "Improving", "up"],
    ["consistent", "Steady", "flat"],
    ["declining", "Declining", "down"],
    ["IMPROVING", "Improving", "up"],
    ["something-new", "Not enough data", "flat"],
    [undefined, "Not enough data", "flat"],
  ] as const)("maps %s", (trend, label, direction) => {
    expect(trendLabel(trend, 5)).toEqual({ label, direction });
  });

  it("never reports a percentage", () => {
    for (const t of ["improving", "consistent", "declining"]) {
      expect(trendLabel(t, 5).label).not.toMatch(/%/);
    }
  });
});

describe("practiceStreak", () => {
  const today = new Date("2026-10-06T12:00:00");
  const day = (d: string) => ({ date: `${d}T09:00:00` });

  it("counts consecutive days ending today", () => {
    expect(practiceStreak([day("2026-10-06"), day("2026-10-05"), day("2026-10-04")], today)).toBe(3);
  });

  it("counts several sessions on one day once", () => {
    expect(practiceStreak([day("2026-10-06"), day("2026-10-06"), day("2026-10-05")], today)).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(practiceStreak([day("2026-10-06"), day("2026-10-04")], today)).toBe(1);
  });

  it("is zero when nothing happened today", () => {
    expect(practiceStreak([day("2026-10-05")], today)).toBe(0);
  });

  it("is zero with no timeline", () => {
    expect(practiceStreak(undefined, today)).toBe(0);
    expect(practiceStreak([], today)).toBe(0);
  });
});

describe("statusLine", () => {
  it("describes the most recent scored interview with the shared verdicts", () => {
    const sessions = [
      session({ session_id: "a", created_at: "2026-10-01T10:00:00Z", overall_score: 60 }),
      session({ session_id: "b", created_at: "2026-10-03T10:00:00Z", overall_score: 82.4 }),
      session({ session_id: "c", created_at: "2026-10-04T10:00:00Z" }),
    ];
    expect(statusLine(sessions)).toBe("Your last interview scored 82 · Strong answer");
  });

  it("uses the mid and low verdicts", () => {
    expect(statusLine([session({ overall_score: 60 })])).toBe("Your last interview scored 60 · Solid, with room to grow");
    expect(statusLine([session({ overall_score: 30 })])).toBe("Your last interview scored 30 · Needs work");
  });

  it("says so when nothing has been scored", () => {
    expect(statusLine([])).toBe("No completed interviews yet.");
    expect(statusLine([session({ overall_score: 0 })])).toBe("No completed interviews yet.");
  });
});

describe("displayName", () => {
  it("prefers the profile, then the auth name, then the email handle", () => {
    expect(displayName({ uid: "u", display_name: "Ada" }, { displayName: "A. L." })).toBe("Ada");
    expect(displayName(null, { displayName: "A. L.", email: "ada@x.com" })).toBe("A. L.");
    expect(displayName(null, { email: "ada@x.com" })).toBe("ada");
    expect(displayName(null, null)).toBe("there");
  });
});

describe("formatSessionDate", () => {
  it("formats a valid timestamp", () => {
    expect(formatSessionDate("2026-10-03T10:00:00Z")).toMatch(/Oct 2026/);
  });

  it("returns an empty string instead of throwing on a malformed timestamp", () => {
    expect(formatSessionDate("not-a-date")).toBe("");
    expect(formatSessionDate("")).toBe("");
  });
});
```

Run: `npm test -- src/components/dashboard/format.test.ts`. Expected: FAIL (`./format` does not exist).

- [ ] **Step 2: Create `src/components/dashboard/format.ts`**

```ts
import { format } from "date-fns";
import { scoreBand, type ScoreBand } from "@/lib/score";
import type { SessionListItem, UserProfile } from "@/services/apiClient";

export type TrendDirection = "up" | "flat" | "down";
export interface TrendInfo {
  label: "Improving" | "Steady" | "Declining" | "Not enough data";
  direction: TrendDirection;
}

/**
 * The backend's `performance_trend` as a word, never a number. It defaults to
 * "consistent" even with zero sessions (routers/analytics.py), so under two
 * completed interviews the honest answer is "Not enough data".
 */
export function trendLabel(trend: string | undefined, completed: number): TrendInfo {
  if (completed < 2) return { label: "Not enough data", direction: "flat" };
  switch ((trend ?? "").toLowerCase()) {
    case "improving":
      return { label: "Improving", direction: "up" };
    case "consistent":
      return { label: "Steady", direction: "flat" };
    case "declining":
      return { label: "Declining", direction: "down" };
    default:
      return { label: "Not enough data", direction: "flat" };
  }
}

/** Consecutive practice days ending today. Moved unchanged from Dashboard.tsx. */
export function practiceStreak(timeline: { date: string }[] | undefined, today: Date = new Date()): number {
  if (!timeline?.length) return 0;
  const uniqueDays = [
    ...new Set(
      timeline.map((t) => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ]
    .map((t) => new Date(t))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);
  for (const day of uniqueDays) {
    const daysDiff = Math.floor((checkDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === streak) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** One verdict per score band, shared with the landing's example card. */
export const VERDICT: Record<ScoreBand, string> = {
  high: "Strong answer",
  mid: "Solid, with room to grow",
  low: "Needs work",
};

export function statusLine(sessions: SessionListItem[]): string {
  const latest = sessions
    .filter((s) => typeof s.overall_score === "number" && s.overall_score > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (!latest) return "No completed interviews yet.";
  const score = Math.round(latest.overall_score as number);
  return `Your last interview scored ${score} · ${VERDICT[scoreBand(score)]}`;
}

export function displayName(
  profile: UserProfile | null,
  user: { displayName?: string | null; email?: string | null } | null,
): string {
  return profile?.display_name || user?.displayName || user?.email?.split("@")[0] || "there";
}

/** "3 Oct 2026", or "" for a timestamp date-fns cannot format (it would throw). */
export function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy");
}
```

- [ ] **Step 3: Run the tests.** Run: `npm test -- src/components/dashboard/format.test.ts`. Expected: PASS.

- [ ] **Step 4: Gates and ledger.**

---

### Task 4: `useDashboardData`

**Files:** Create `src/components/dashboard/useDashboardData.ts`, `src/components/dashboard/useDashboardData.test.tsx`.

**Interfaces:**
- Consumes: `useAuth()`, `useToast()`, `userApi.getProfile`, `interviewApi.listSessions(limit)`, `analyticsApi.getOverview`, `analyticsApi.getProgress`.
- Produces: `useDashboardData(): { loading: boolean; profile: UserProfile | null; sessions: SessionListItem[]; overview: OverviewData | null; progress: ProgressData | null; refresh(): Promise<void> }`, plus the exported `OverviewData` and `ProgressData` types.

- [ ] **Step 1: Write the failing test**

```tsx
import { renderHook, waitFor, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "./useDashboardData";

const auth = vi.hoisted(() => ({ user: { uid: "u1", email: "ada@example.com", displayName: "Ada" } }));
const toast = vi.hoisted(() => vi.fn());
const api = vi.hoisted(() => ({
  getProfile: vi.fn(),
  listSessions: vi.fn(),
  getOverview: vi.fn(),
  getProgress: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/services/apiClient", () => ({
  userApi: { getProfile: api.getProfile },
  interviewApi: { listSessions: api.listSessions },
  analyticsApi: { getOverview: api.getOverview, getProgress: api.getProgress },
}));

beforeEach(() => {
  toast.mockReset();
  api.getProfile.mockResolvedValue({ uid: "u1", display_name: "Ada" });
  api.listSessions.mockResolvedValue([{ session_id: "s1" }]);
  api.getOverview.mockResolvedValue({ completed_sessions: 1 });
  api.getProgress.mockResolvedValue({ score_timeline: [] });
});

describe("useDashboardData", () => {
  it("is loading until the first fetch settles, then exposes the data", async () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toEqual({ uid: "u1", display_name: "Ada" });
    expect(result.current.sessions).toEqual([{ session_id: "s1" }]);
    expect(result.current.overview).toEqual({ completed_sessions: 1 });
    expect(api.listSessions).toHaveBeenCalledWith(20);
  });

  it("falls back to the auth user when the profile request fails", async () => {
    api.getProfile.mockRejectedValue(new Error("nope"));
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile).toMatchObject({ uid: "u1", display_name: "Ada" });
  });

  it("stops loading and toasts when sessions fail", async () => {
    api.listSessions.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error Loading Sessions" }));
  });

  it("refresh refetches sessions and analytics", async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.listSessions.mockClear();
    api.getOverview.mockClear();
    await act(() => result.current.refresh());
    expect(api.listSessions).toHaveBeenCalledTimes(1);
    expect(api.getOverview).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Refreshed" }));
  });
});
```

Run: `npm test -- src/components/dashboard/useDashboardData.test.tsx`. Expected: FAIL (module missing).

- [ ] **Step 2: Create `src/components/dashboard/useDashboardData.ts`.**
  - Move `fetchProfile`, `fetchSessions`, `fetchAnalytics`, the `visibilitychange` and `focus` effects, and `handleRefresh` (renamed `refresh`) out of `src/pages/Dashboard.tsx` (current lines ~63–120 and 286–300), keeping their bodies **verbatim**.
  - Add the `loading` state, set false in a `finally` after the first `fetchAll`.

```ts
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { analyticsApi, interviewApi, userApi, type SessionListItem, type UserProfile } from "@/services/apiClient";

export interface OverviewData {
  total_sessions: number;
  completed_sessions: number;
  average_score: number;
  highest_score?: number;
  performance_trend: string;
  recent_scores: number[];
}

export interface ProgressData {
  score_timeline: { date: string; score: number; mode: string; readiness: string }[];
  top_strengths?: { item: string; count: number }[];
  top_improvements?: { item: string; count: number }[];
}

/**
 * Everything the dashboard shows, fetched as before (moved verbatim from
 * Dashboard.tsx): profile with auth fallback, 20 sessions, overview + progress,
 * and a refetch whenever the tab regains focus. `loading` is new — true until
 * the first fetch settles, so the page shows skeletons rather than zeros.
 */
export function useDashboardData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  const fetchProfile = async () => {
    try {
      const data = await userApi.getProfile();
      setProfile(data);
    } catch (error) {
      // Fallback to auth-context user metadata
      setProfile({
        uid: user?.uid || "",
        email: user?.email || undefined,
        display_name: user?.displayName || user?.email?.split("@")[0] || "User",
        avatar_url: user?.photoURL || undefined,
      });
    }
  };

  const fetchSessions = async () => {
    try {
      const data = await interviewApi.listSessions(20);
      setSessions(data);
    } catch (error) {
      toast({
        title: "Error Loading Sessions",
        description: "Failed to load your interview sessions. Please try refreshing.",
        variant: "destructive",
      });
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [ov, prog] = await Promise.all([analyticsApi.getOverview(), analyticsApi.getProgress()]);
      setOverview(ov as OverviewData);
      setProgress(prog as ProgressData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchProfile(), fetchSessions(), fetchAnalytics()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) {
        fetchSessions();
        fetchAnalytics();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchSessions();
        fetchAnalytics();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  const refresh = async () => {
    try {
      await Promise.all([fetchSessions(), fetchAnalytics()]);
      toast({ title: "Refreshed", description: "Data has been refreshed successfully." });
    } catch (error) {
      toast({ title: "Refresh Failed", description: "Unable to refresh data. Please try again.", variant: "destructive" });
    }
  };

  return { loading, profile, sessions, overview, progress, refresh };
}
```

- [ ] **Step 3: Run the tests.** Expected: PASS (4).
- [ ] **Step 4: Gates and ledger.** Lint: the three effects carry the same `exhaustive-deps` warnings `Dashboard.tsx` had. Task 6 deletes them from `Dashboard.tsx`, so the net count must not rise; confirm ≤ 78 after Task 6.

---

### Task 5: Dashboard sections

**Files:** Create `src/components/dashboard/{WelcomeCard,StatTiles,ScoreTrend,FocusNext,RecentInterviews}.tsx` and `src/components/dashboard/sections.test.tsx`.

**Interfaces:**
- Consumes: Task 3 helpers, Task 4 types, `SCORE_COLORS`, `scoreBand`, `SCORE_LOW_MAX`, `SCORE_HIGH_MIN`, `Skeleton`, `Button`.
- Produces:
  - `WelcomeCard({ loading, name, status, hasSessions })`
  - `StatTiles({ loading, overview, streak })`
  - `ScoreTrend({ loading, timeline })`
  - `FocusNext({ loading, improvements })`
  - `RecentInterviews({ loading, sessions, onRefresh })`

- [ ] **Step 1: Write the failing test `src/components/dashboard/sections.test.tsx`**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { SessionListItem } from "@/services/apiClient";
import { FocusNext } from "./FocusNext";
import { RecentInterviews } from "./RecentInterviews";
import { ScoreTrend } from "./ScoreTrend";
import { StatTiles } from "./StatTiles";
import { WelcomeCard } from "./WelcomeCard";

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const overview = {
  total_sessions: 6,
  completed_sessions: 5,
  average_score: 81.6,
  performance_trend: "improving",
  recent_scores: [70, 82],
};

describe("StatTiles", () => {
  it("shows real numbers, a worded trend and the average coloured by the score scale", () => {
    wrap(<StatTiles loading={false} overview={overview} streak={3} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("82")).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("Improving")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/%/);
  });

  it("shows dashes and not-enough-data for a new user", () => {
    wrap(<StatTiles loading={false} overview={{ ...overview, completed_sessions: 0, average_score: 0, performance_trend: "consistent" }} streak={0} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Not enough data")).toBeInTheDocument();
    expect(screen.getByText("0 days")).toBeInTheDocument();
  });

  it("shows skeletons, never zeros, while loading", () => {
    wrap(<StatTiles loading overview={null} streak={0} />);
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
  });
});

describe("WelcomeCard", () => {
  it("greets returning users with their status line", () => {
    wrap(<WelcomeCard loading={false} name="Ada" status="Your last interview scored 82 · Strong answer" hasSessions />);
    expect(screen.getByRole("heading", { name: "Welcome back, Ada" })).toBeInTheDocument();
    expect(screen.getByText("Your last interview scored 82 · Strong answer")).toBeInTheDocument();
  });

  it("guides new users through getting started", () => {
    wrap(<WelcomeCard loading={false} name="Ada" status="" hasSessions={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /start your first interview/i })).toHaveAttribute("href", "/interview/setup");
  });
});

describe("ScoreTrend", () => {
  it("asks for two interviews before drawing a trend", () => {
    wrap(<ScoreTrend loading={false} timeline={[{ date: "2026-10-01", score: 70, mode: "m", readiness: "r" }]} />);
    expect(screen.getByText("Complete two interviews to see your trend.")).toBeInTheDocument();
  });

  it("lists the scores for screen readers, oldest to newest", () => {
    wrap(
      <ScoreTrend
        loading={false}
        timeline={[
          { date: "2026-10-03", score: 82, mode: "m", readiness: "r" },
          { date: "2026-10-01", score: 70.4, mode: "m", readiness: "r" },
        ]}
      />,
    );
    expect(screen.getByText("Scores, oldest to newest: 70, 82.")).toBeInTheDocument();
  });
});

describe("FocusNext", () => {
  it("lists up to three improvement themes and links to practice", () => {
    wrap(
      <FocusNext
        loading={false}
        improvements={["Quantify impact", "Use STAR", "Be concise", "Fourth"].map((item) => ({ item, count: 2 }))}
      />,
    );
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /practise these/i })).toHaveAttribute("href", "/dashboard/practice-questions");
  });

  it("explains when there is nothing yet", () => {
    wrap(<FocusNext loading={false} improvements={[]} />);
    expect(screen.getByText("Your improvement themes appear after your first completed interview.")).toBeInTheDocument();
  });
});

describe("RecentInterviews", () => {
  const sessions: SessionListItem[] = [
    { session_id: "a", status: "completed", mode: "behavioral", created_at: "2026-10-03T10:00:00Z", question_count: 8, overall_score: 82 },
    { session_id: "b", status: "in_progress", mode: "technical", created_at: "not-a-date", question_count: 5 },
  ];

  it("links every row to its results with a score pill on the shared scale", () => {
    wrap(<RecentInterviews loading={false} sessions={sessions} onRefresh={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/results/a", "/results/b"]);
    expect(screen.getByText("82")).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("survives a malformed date", () => {
    wrap(<RecentInterviews loading={false} sessions={sessions} onRefresh={vi.fn()} />);
    expect(screen.getByText(/technical interview/i)).toBeInTheDocument();
  });

  it("refreshes on demand", async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    wrap(<RecentInterviews loading={false} sessions={sessions} onRefresh={onRefresh} />);
    await user.click(screen.getByRole("button", { name: "Refresh interviews" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("offers a first interview when empty", () => {
    wrap(<RecentInterviews loading={false} sessions={[]} onRefresh={vi.fn()} />);
    expect(screen.getByText("No interviews yet")).toBeInTheDocument();
  });
});
```

Run: `npm test -- src/components/dashboard/sections.test.tsx`. Expected: FAIL (modules missing).

- [ ] **Step 2: Create `src/components/dashboard/StatTiles.tsx`**

```tsx
import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame, Target, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS, scoreBand, type ScoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import { trendLabel } from "./format";
import type { OverviewData } from "./useDashboardData";

const CARD = "rounded-2xl border border-border bg-card p-5 shadow-[var(--card-shadow)]";

export function StatTiles({ loading, overview, streak }: { loading: boolean; overview: OverviewData | null; streak: number }) {
  if (loading) {
    return (
      <ul aria-busy="true" aria-label="Loading stats" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <Skeleton className="h-[124px] rounded-2xl" />
          </li>
        ))}
      </ul>
    );
  }

  const completed = overview?.completed_sessions ?? 0;
  const average = completed > 0 ? Math.round(overview?.average_score ?? 0) : null;
  const band: ScoreBand | undefined = average === null ? undefined : scoreBand(average);
  const trend = trendLabel(overview?.performance_trend, completed);
  const TrendIcon = trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : ArrowRight;

  const tiles = [
    { label: "Interviews completed", value: String(completed), icon: Video },
    { label: "Average score", value: average === null ? "—" : String(average), icon: Target, band },
    { label: "Trend", value: trend.label, icon: TrendIcon },
    { label: "Practice streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, icon: Flame },
  ];

  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.label} className={CARD}>
          <tile.icon className="size-5 text-accent" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">{tile.label}</p>
          <p
            data-score-band={tile.band}
            className={cn(
              "mt-1 font-semibold tracking-[-0.02em] text-foreground",
              tile.value.length > 8 ? "text-lg leading-snug" : "text-[1.75rem] leading-none",
            )}
            style={tile.band ? { color: SCORE_COLORS[tile.band].text } : undefined}
          >
            {tile.value}
          </p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create `src/components/dashboard/WelcomeCard.tsx`**

```tsx
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)] sm:p-8";
const GET_STARTED = ["Add your résumé and the job", "Take an adaptive interview", "Review your scored feedback"];

export function WelcomeCard({
  loading,
  name,
  status,
  hasSessions,
}: {
  loading: boolean;
  name: string;
  status: string;
  hasSessions: boolean;
}) {
  if (loading) return <Skeleton aria-label="Loading" className="h-[168px] rounded-2xl" />;

  if (!hasSessions) {
    return (
      <section aria-labelledby="welcome-heading" className={CARD}>
        <h2 id="welcome-heading" className="text-xl font-semibold tracking-[-0.01em]">
          Welcome, {name}
        </h2>
        <p className="mt-1 text-muted-foreground">Three steps to your first scored interview.</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {GET_STARTED.map((step, i) => (
            <li key={step} className="rounded-xl border border-border bg-secondary/50 p-4">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Step {i + 1}</span>
              <p className="mt-1 text-sm font-medium text-foreground">{step}</p>
            </li>
          ))}
        </ol>
        <Button asChild size="lg" className="mt-6">
          <Link to="/interview/setup">
            Start your first interview
            <ArrowRight className="ml-1 size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="welcome-heading" className={CARD}>
      <h2 id="welcome-heading" className="text-xl font-semibold tracking-[-0.01em]">
        Welcome back, {name}
      </h2>
      <p className="mt-1 text-muted-foreground">{status}</p>
    </section>
  );
}
```

- [ ] **Step 4: Create `src/components/dashboard/ScoreTrend.tsx`**

```tsx
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_HIGH_MIN, SCORE_LOW_MAX } from "@/lib/score";
import type { ProgressData } from "./useDashboardData";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)]";
const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

/** Last ten scores, oldest to newest, with the engine's adaptation lines. */
export function ScoreTrend({ loading, timeline }: { loading: boolean; timeline: ProgressData["score_timeline"] | undefined }) {
  const points = [...(timeline ?? [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((p, i) => ({ n: i + 1, score: Math.round(p.score) }));

  return (
    <section aria-labelledby="score-trend-heading" className={CARD}>
      <h2 id="score-trend-heading" className="text-lg font-semibold">
        Recent scores
      </h2>
      <p className="text-sm text-muted-foreground">Difficulty rises above {SCORE_HIGH_MIN} and eases below {SCORE_LOW_MAX}.</p>
      {loading ? (
        <Skeleton className="mt-6 h-[180px]" />
      ) : points.length < 2 ? (
        <p className="mt-6 rounded-xl bg-secondary/50 p-6 text-center text-sm text-muted-foreground">
          Complete two interviews to see your trend.
        </p>
      ) : (
        <>
          <p className="sr-only">Scores, oldest to newest: {points.map((p) => p.score).join(", ")}.</p>
          <div aria-hidden="true" className="mt-4 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="n" tick={false} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} ticks={[0, SCORE_LOW_MAX, SCORE_HIGH_MIN, 100]} tick={AXIS} axisLine={false} tickLine={false} />
                <ReferenceLine
                  y={SCORE_HIGH_MIN}
                  stroke="hsl(var(--score-high))"
                  strokeDasharray="4 4"
                  label={{ value: "Harder above", position: "insideTopRight", ...AXIS }}
                />
                <ReferenceLine
                  y={SCORE_LOW_MAX}
                  stroke="hsl(var(--score-low))"
                  strokeDasharray="4 4"
                  label={{ value: "Easier below", position: "insideBottomRight", ...AXIS }}
                />
                <ChartTooltip formatter={(value: number) => [value, "Score"]} labelFormatter={() => ""} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Create `src/components/dashboard/FocusNext.tsx`**

```tsx
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)]";

export function FocusNext({ loading, improvements }: { loading: boolean; improvements: { item: string; count: number }[] | undefined }) {
  const items = (improvements ?? []).slice(0, 3);
  return (
    <section aria-labelledby="focus-next-heading" className={CARD}>
      <h2 id="focus-next-heading" className="text-lg font-semibold">
        Focus next
      </h2>
      <p className="text-sm text-muted-foreground">Themes that came up most in your feedback.</p>
      {loading ? (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">Your improvement themes appear after your first completed interview.</p>
      ) : (
        <ol className="mt-5 space-y-3">
          {items.map((it, i) => (
            <li key={it.item} className="flex items-start gap-3 text-sm text-foreground">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5">{it.item}</span>
            </li>
          ))}
        </ol>
      )}
      <Link to="/dashboard/practice-questions" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        Practise these
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
```

- [ ] **Step 6: Create `src/components/dashboard/RecentInterviews.tsx`**

```tsx
import { ChevronRight, RefreshCw, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS, scoreBand } from "@/lib/score";
import type { SessionListItem } from "@/services/apiClient";
import { formatSessionDate } from "./format";

export function RecentInterviews({
  loading,
  sessions,
  onRefresh,
}: {
  loading: boolean;
  sessions: SessionListItem[];
  onRefresh: () => void;
}) {
  return (
    <section aria-labelledby="recent-heading" className="rounded-2xl border border-border bg-card shadow-[var(--card-shadow)]">
      <div className="flex items-center justify-between border-b border-border px-6 py-5">
        <div>
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recent interviews
          </h2>
          <p className="text-sm text-muted-foreground">Your latest sessions</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh interviews">
          <RefreshCw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3 p-6">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-medium text-foreground">No interviews yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start your first interview to see it here.</p>
          <Button asChild className="mt-6">
            <Link to="/interview/setup">New interview</Link>
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.slice(0, 8).map((s) => {
            const score = s.overall_score && s.overall_score > 0 ? Math.round(s.overall_score) : null;
            const band = score === null ? undefined : scoreBand(score);
            const date = formatSessionDate(s.created_at);
            return (
              <li key={s.session_id}>
                <Link
                  to={`/results/${s.session_id}`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10">
                    <Video className="size-5 text-primary" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium capitalize text-foreground">{s.mode} interview</span>
                    <span className="block text-xs text-muted-foreground">
                      {[date, `${s.question_count} questions`, s.status.replace(/_/g, " ")].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    data-score-band={band}
                    className="min-w-[3rem] rounded-full px-2.5 py-1 text-center text-sm font-semibold tabular-nums text-muted-foreground"
                    style={
                      band
                        ? {
                            color: SCORE_COLORS[band].text,
                            background: `color-mix(in srgb, ${SCORE_COLORS[band].fill} 14%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {score ?? "—"}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Run the tests.** Run: `npm test -- src/components/dashboard/sections.test.tsx`. Expected: PASS. Recharts may warn about zero-size `ResponsiveContainer` in jsdom; that's harmless.
- [ ] **Step 8: Gates and ledger.**

---

### Task 6: Dashboard page

**Files:** Rewrite `src/pages/Dashboard.tsx`. Create `src/pages/Dashboard.test.tsx`. Delete `src/components/layout/AppSidebar.tsx`.

**Interfaces:** Consumes Tasks 1 and 3–5. Produces the default export `Dashboard`.

- [ ] **Step 1: Write the failing test `src/pages/Dashboard.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const data = vi.hoisted(() => ({
  value: {
    loading: false,
    profile: { uid: "u1", display_name: "Ada" },
    sessions: [{ session_id: "a", status: "completed", mode: "behavioral", created_at: "2026-10-03T10:00:00Z", question_count: 8, overall_score: 82 }],
    overview: { total_sessions: 1, completed_sessions: 1, average_score: 82, performance_trend: "consistent", recent_scores: [82] },
    progress: { score_timeline: [], top_improvements: [{ item: "Quantify impact", count: 2 }] },
    refresh: vi.fn(),
  },
}));
vi.mock("@/components/dashboard/useDashboardData", () => ({ useDashboardData: () => data.value }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1", email: "ada@example.com" } }) }));

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("Dashboard", () => {
  it("has one page heading and a New interview action", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new interview/i })).toHaveAttribute("href", "/interview/setup");
  });

  it("composes the sections from real data", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Welcome back, Ada" })).toBeInTheDocument();
    expect(screen.getByText("Your last interview scored 82 · Strong answer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent scores" })).toBeInTheDocument();
    expect(screen.getByText("Quantify impact")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent interviews" })).toBeInTheDocument();
  });

  it("draws no page chrome of its own (the shell owns it)", () => {
    renderPage();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/sign out/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\+\d+%/);
  });
});
```

Run: `npm test -- src/pages/Dashboard.test.tsx`. Expected: FAIL (the old page has two headings-of-note, search, sign-out, and "+0%").

- [ ] **Step 2: Rewrite `src/pages/Dashboard.tsx`**

```tsx
import { Sparkles } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FocusNext } from "@/components/dashboard/FocusNext";
import { displayName, practiceStreak, statusLine } from "@/components/dashboard/format";
import { RecentInterviews } from "@/components/dashboard/RecentInterviews";
import { ScoreTrend } from "@/components/dashboard/ScoreTrend";
import { StatTiles } from "@/components/dashboard/StatTiles";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { WelcomeCard } from "@/components/dashboard/WelcomeCard";
import { PageContainer, PageHeader } from "@/components/shell/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The signed-in home, inside the shell (spec §4). Every number comes from the
 * API; nothing is estimated. Fetching lives in useDashboardData.
 */
const Dashboard = () => {
  const { user } = useAuth();
  const { loading, profile, sessions, overview, progress, refresh } = useDashboardData();

  return (
    <PageContainer>
      <Helmet>
        <title>Dashboard — Amplify Interview</title>
      </Helmet>
      <PageHeader
        title="Dashboard"
        subtitle="Your practice at a glance"
        actions={
          <Button asChild>
            <Link to="/interview/setup">
              <Sparkles className="mr-1.5 size-4" aria-hidden="true" />
              New interview
            </Link>
          </Button>
        }
      />
      <div className="mt-8 space-y-6">
        <WelcomeCard
          loading={loading}
          name={displayName(profile, user)}
          status={statusLine(sessions)}
          hasSessions={sessions.length > 0}
        />
        <StatTiles loading={loading} overview={overview} streak={practiceStreak(progress?.score_timeline)} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <ScoreTrend loading={loading} timeline={progress?.score_timeline} />
          <FocusNext loading={loading} improvements={progress?.top_improvements} />
        </div>
        <RecentInterviews loading={loading} sessions={sessions} onRefresh={refresh} />
      </div>
    </PageContainer>
  );
};

export default Dashboard;
```

- [ ] **Step 3: Delete the old sidebar.**
  - Run `rm src/components/layout/AppSidebar.tsx`.
  - Then `grep -rn "layout/AppSidebar" src`. Expected: only `InterviewSetup.tsx`, which Task 7 removes. If Task 7 has not run yet, do Step 3 after Task 7 instead, and note it in the ledger.

- [ ] **Step 4: Run tests and gates.** Run `npm test -- src/pages/Dashboard.test.tsx`, expecting PASS. Then run the full gates. Lint must be ≤ 78: the dashboard's old warnings moved with the effects, not doubled.

---

### Task 7: Shelled pages drop their own chrome

**Files:**
- Modify `src/pages/{InterviewSetup,PracticeQuestions,Progress,Insights,InterviewResults}.tsx`.
- Create `src/test/chrome.test.ts`.

**Interfaces:** Consumes `PageHeader`, `PageContainer` (Task 1).

- [ ] **Step 1: Write the failing static rule `src/test/chrome.test.ts`**

```ts
/// <reference types="node" />
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Pages rendered inside AppShell must not draw their own page chrome: the shell
 * owns the sidebar, the full-height frame and the way back. Mock analytics
 * pages and SessionReview are exempt until sub-project 5.
 */
const SHELLED = ["InterviewSetup", "PracticeQuestions", "Progress", "Insights", "InterviewResults", "Dashboard"];

describe.each(SHELLED)("%s", (page) => {
  const source = readFileSync(resolve(process.cwd(), "src/pages", `${page}.tsx`), "utf8");

  it("does not mount a second sidebar", () => {
    expect(source).not.toMatch(/SidebarProvider|AppSidebar/);
  });

  it("does not draw a 'Back to Dashboard' header", () => {
    expect(source).not.toMatch(/Back to Dashboard/);
  });

  it("does not claim the full viewport height", () => {
    expect(source).not.toMatch(/min-h-screen|h-screen/);
  });

  it("titles itself with the shared PageHeader", () => {
    expect(source).toMatch(/<PageHeader/);
  });
});
```

Run: `npm test -- src/test/chrome.test.ts`. Expected: FAIL for the five non-dashboard pages.

- [ ] **Step 2: InterviewSetup.**
  - Delete the `SidebarInset`/`SidebarProvider`/`SidebarTrigger` imports and the `AppSidebar` import (lines ~20–26).
  - Replace the opening wrapper. Everything from `<SidebarProvider>` through the closing `</header>` (lines ~119–147), keeping the existing `<Helmet>` block, becomes:

```tsx
    <PageContainer className="max-w-5xl">
      <Helmet>
        <title>New Interview - Amplify Interview</title>
        <meta
          name="description"
          content="Upload your resume and job description to generate a personalized interview."
        />
      </Helmet>
      <PageHeader
        title="New interview"
        subtitle="A personalised interview from your résumé and the role."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </Button>
        }
      />
```

  - Change `<main className="px-4 md:px-10 py-8 max-w-5xl mx-auto w-full">` to `<div className="mt-8">`, and its `</main>` to `</div>`.
  - Replace the tail `</SidebarInset>\n      </div>\n    </SidebarProvider>` with `</PageContainer>`.
  - Add `import { PageContainer, PageHeader } from "@/components/shell/PageHeader";`.
  - Remove `Sparkles` from the lucide import if it is now unused.

- [ ] **Step 3: PracticeQuestions.**
  - Loading branch: change `className="min-h-screen bg-background flex items-center justify-center"` to `className="flex min-h-[60vh] items-center justify-center"`.
  - Main branch: replace `<div className="min-h-screen bg-background">` with `<PageContainer>`, and the matching final `</div>` of the page component with `</PageContainer>`.
  - Replace the `{/* Header */}` `<header>…</header>` block (lines ~322–363) with a `PageHeader`. Move the existing `<Dialog open={showAddDialog} …>…</Dialog>` block **unchanged** into its `actions`:

```tsx
      <PageHeader
        title="Practice questions"
        subtitle="Build your personal question bank for better interview preparation."
        actions={
          /* the existing <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>…</Dialog>, unchanged */
        }
      />
```

  - Change the following `<main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4 sm:space-y-6">` to `<div className="mt-8 space-y-4 sm:space-y-6">`, and its `</main>` to `</div>`.
  - Remove the `ArrowLeft` import and, if now unused, the `Link` import.
  - Add the `PageHeader`/`PageContainer` import.

- [ ] **Step 4: Progress.**
  - Loading branch: same change as Step 3.
  - Empty branch (`!progressData`): replace the whole return with:

```tsx
    return (
      <PageContainer>
        <PageHeader title="Progress" subtitle="How your scores are moving over time." />
        <div className="mt-8 rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No progress data available yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Complete your first interview to see your progress!</p>
        </div>
      </PageContainer>
    );
```

  - Main branch: `<div className="min-h-screen bg-background">` becomes `<PageContainer>`.
  - Its `<header>…</header>` (lines ~258–272) becomes `<PageHeader title="Progress" subtitle="How your scores are moving over time." />`.
  - `<main className="container mx-auto px-4 py-8 space-y-8">` becomes `<div className="mt-8 space-y-8">`, with the matching closers updated.
  - Remove the now-unused `ArrowLeft`/`Link` imports and add the `PageHeader` import.

- [ ] **Step 5: Insights.** Same three edits as Progress:
  - the loading branch;
  - the empty branch, with title "Insights", subtitle "Patterns across your interviews.", and the existing two empty-state lines;
  - the main branch's header (lines ~228–242) and its `<main className="container …">`.

- [ ] **Step 6: InterviewResults.**
  - The loading/generating and not-found branches: `min-h-screen bg-background flex flex-col items-center justify-center p-6` becomes `flex min-h-[60vh] flex-col items-center justify-center p-6`.
  - Main branch: replace the root `<div className="min-h-screen bg-background text-foreground pb-20">` with `<PageContainer className="max-w-7xl pb-20">`, and its closing `</div>` with `</PageContainer>`.
  - Replace the sticky header's `<h1 className="text-xl font-bold font-outfit">Interview Results</h1>` with a `PageHeader`. The header `div` (`bg-card/50 backdrop-blur-xl … sticky top-0 z-50`) becomes:

```tsx
      <PageHeader
        title="Interview results"
        subtitle={/* the existing time/duration <p> content, unchanged */}
        actions={/* the existing right-hand header buttons, unchanged */}
      />
```

  - Wrap the rest of the page body below the header in `<div className="mt-8">…</div>` if it relied on the header's spacing.
  - Do not touch anything else in this file (sub-project 4).

- [ ] **Step 7: Run tests and gates.**
  - Run `npm test -- src/test/chrome.test.ts`, expecting PASS (24).
  - Then the full gates.
  - Then Task 6 Step 3 if it was deferred.

---

### Task 8: Visual verification and final gates

**Files:** Modify `scripts/screenshot-landing.mjs`.

- [ ] **Step 1: Add shell and dashboard captures** before the smoke section in `scripts/screenshot-landing.mjs`:

```js
// ── Sub-project 3: the shell and dashboard, with API fixtures so the
// populated state renders without a backend.
const API_CORS = {
  "access-control-allow-origin": BASE,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};
const fulfil = (json) => (route) =>
  route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers: API_CORS })
    : route.fulfill({ status: 200, headers: API_CORS, json });

const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
const POPULATED = {
  profile: { uid: "u1", display_name: "Ada Lovelace", email: "ada@example.com" },
  sessions: [82, 74, 69, 61, 77].map((score, i) => ({
    session_id: `s${i}`,
    status: "completed",
    mode: ["behavioral", "technical", "mixed", "behavioral", "technical"][i],
    created_at: day(i),
    question_count: 8,
    overall_score: score,
  })),
  overview: { total_sessions: 5, completed_sessions: 5, average_score: 72.6, highest_score: 82, performance_trend: "improving", recent_scores: [82, 74, 69, 61, 77] },
  progress: {
    score_timeline: [61, 69, 74, 77, 82].map((score, i) => ({ date: day(4 - i), score, mode: "mixed", readiness: "ready" })),
    top_improvements: [
      { item: "Quantify the impact of your work", count: 4 },
      { item: "Name the trade-off you rejected", count: 3 },
      { item: "Open with the outcome, then the context", count: 2 },
    ],
  },
};

async function shootApp(name, { width, path = "/dashboard", data, fullPage = true, before }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript(() => localStorage.setItem("amplify_id_token", "mock-user-token"));
  const page = await context.newPage();
  page.on("pageerror", (err) => problems.push(`${name}: page error: ${err.message}`));
  await page.route("**/api/**", fulfil({}));
  if (data) {
    await page.route("**/api/user/profile", fulfil(data.profile));
    await page.route("**/api/interview/sessions**", fulfil(data.sessions));
    await page.route("**/api/analytics/overview", fulfil(data.overview));
    await page.route("**/api/analytics/progress", fulfil(data.progress));
  } else {
    await page.route("**/api/interview/sessions**", fulfil([]));
    await page.route("**/api/analytics/overview", fulfil({ total_sessions: 0, completed_sessions: 0, average_score: 0, performance_trend: "consistent", recent_scores: [] }));
    await page.route("**/api/analytics/progress", fulfil({ score_timeline: [], top_improvements: [] }));
  }
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  if (before) await before(page);
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  await context.close();
}

for (const width of [375, 1440]) {
  await shootApp(`app-dashboard-${width}`, { width, data: POPULATED });
  await shootApp(`app-dashboard-empty-${width}`, { width });
}
await shootApp("app-dashboard-collapsed-1440", {
  width: 1440,
  data: POPULATED,
  fullPage: false,
  before: (page) => page.getByRole("button", { name: "Toggle Sidebar" }).click(),
});
await shootApp("app-nav-open-375", {
  width: 375,
  data: POPULATED,
  fullPage: false,
  before: async (page) => {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.waitForTimeout(600);
  },
});
for (const path of ["/interview/setup", "/dashboard/practice-questions", "/dashboard/progress", "/dashboard/insights"]) {
  await shootApp(`app${path.replaceAll("/", "-")}-1440`, { width: 1440, path, fullPage: false });
}
```

Also remove `/dashboard` and `/interview/setup` from the old smoke loop. They are now covered above.

- [ ] **Step 2: Run it.**
  - Start the dev server in the background (`npm run dev`).
  - Run `node scripts/screenshot-landing.mjs`. Expected: `Screens written…`, exit 0.

- [ ] **Step 3: Review every `app-*.png` by eye** against the spec:
  - navy rail, active item tinted, account and Sign out at the foot;
  - collapsed rail shows icons only;
  - phone: top bar with menu, and the sheet opens;
  - populated dashboard: four real tiles (average in the score colour, Trend "Improving"), line chart with the 45/78 lines, Focus next with 3 items, five recent rows with coloured pills;
  - empty dashboard: Get started (3 steps), "—", "Not enough data", "0 days", "No interviews yet";
  - the trimmed pages show one header, no "Back to Dashboard", and no double scroll.

  Fix what's wrong in the owning component and re-run.

- [ ] **Step 4: Final gates.**
  - Run `npm test && npm run typecheck && npx eslint . 2>&1 | tail -2 && npm run build`. Expected: all pass; lint ≤ 78.
  - Stop the dev server.

- [ ] **Step 5: Whole-sub-project review.**
  - Dispatch a fresh reviewer (most capable model) with the spec, this plan, the ledger's `Ruling:` lines, and the Review Focus section.
  - Fix Critical and Important findings with RED→GREEN tests.
  - Ledger the minor findings.
  - Report to the user. **No commit.**
