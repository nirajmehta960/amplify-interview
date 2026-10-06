# Frontend Phase 3 — App Shell, Providers, and Routing

**What this covers:** how the app boots, how providers nest, and how routes are guarded.
**Files:** `src/main.tsx`, `src/App.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/layout/AppSidebar.tsx`
**You need to know:** React context, React Router 6, provider composition

---

## Entry point

```tsx
// src/main.tsx — 11 lines
if (import.meta.env.VITE_GA4_MEASUREMENT_ID) {
  ReactGA.initialize(import.meta.env.VITE_GA4_MEASUREMENT_ID);
}
createRoot(document.getElementById("root")!).render(<App />);
```

**No `<React.StrictMode>`.** In development, StrictMode double-invokes effects to surface impurity — which would expose real bugs in this codebase, particularly the `useEffect`-based data fetching and the media-stream setup in the interview page. Its absence is convenient and hides genuine problems; re-enabling it is a good exercise.

Analytics initialization is conditional, so a missing measurement ID degrades silently rather than throwing.

---

## Provider nesting

```tsx
<HelmetProvider>                      {/* document <head> per route */}
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />                     {/* shadcn toast */}
      <Sonner />                      {/* sonner toast */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>…</Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
</HelmetProvider>
```

The ordering is not arbitrary:

**`AuthProvider` is inside `BrowserRouter`** so it can use router hooks (`useNavigate`) to redirect on sign-out. Putting it outside would throw "useNavigate may be used only in the context of a Router".

**Toasters are siblings above the router**, so a toast survives navigation instead of unmounting with the page that triggered it.

**Two toast systems are mounted.** shadcn's `Toaster` (via `useToast`) is what pages actually use; `Sonner` is also rendered. Redundant — one could go.

The `future` flags opt into React Router v7 behaviour early, smoothing the eventual upgrade.

### TanStack Query is mounted and unused

```tsx
const queryClient = new QueryClient();
```

`QueryClientProvider` wraps the app, and there are **zero** `useQuery`, `useMutation`, or `useQueryClient` calls anywhere in `src/`. Every page hand-rolls fetching:

```tsx
const [sessions, setSessions] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  (async () => {
    try {
      const data = await interviewApi.listSessions();
      setSessions(data);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

That pattern is repeated in `Dashboard.tsx` (three separate effects), `Progress.tsx`, `Insights.tsx`, `InterviewResults.tsx`, and `PracticeQuestions.tsx`.

**What it costs:** no caching (revisiting the dashboard refetches everything), no deduplication, no background refresh, no retry, no stale-while-revalidate, and ~15 lines of boilerplate per fetch. Adopting the library that is already installed and already wrapped would delete a lot of code and fix all of it.

---

## Routes

```tsx
<Routes>
  {/* public */}
  <Route path="/" element={<Index />} />
  <Route path="/auth/signin" element={<SignIn />} />
  <Route path="/auth/signup" element={<SignUp />} />
  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
  <Route path="/auth/reset-password" element={<ResetPassword />} />

  {/* protected */}
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/dashboard/analytics" …/>
  <Route path="/dashboard/progress" …/>
  <Route path="/dashboard/insights" …/>
  <Route path="/dashboard/practice-questions" …/>
  <Route path="/interview/setup" …/>
  <Route path="/interview/session" …/>
  <Route path="/processing" …/>
  <Route path="/results/:sessionId" …/>
  <Route path="/review/:sessionId" …/>

  <Route path="*" element={<NotFound />} />
</Routes>
```

Five public, twelve protected, one catch-all. The catch-all must be last — React Router 6 ranks by specificity, but keeping `*` at the end is the readable convention.

Note `/interview/session` takes **no** session ID in the URL. The session is created on mount and the ID kept in component state, which means a page refresh mid-interview loses the reference — see Phase 6.

---

## The route guard

```tsx
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center">
             <Loader2 className="animate-spin" /></div>;
  }
  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};
```

The **three-state** structure is the important part. A naive guard checks only `if (!user) redirect`, which flashes the sign-in page on every refresh while auth restores from `localStorage`. Handling `loading` separately avoids that.

`state={{ from: location }}` records where the user was headed so sign-in can return them there. `replace` keeps the redirect out of history, so Back doesn't bounce them into a redirect loop.

**This is client-side only** — it controls rendering, not data access. Security lives entirely in the backend's JWT verification. Anyone can bypass this guard in devtools and see an empty shell; they cannot read data.

---

## Layout: no global shell

There is no persistent app chrome. Two alternative layouts exist and are applied per page:

**`AppSidebar.tsx`** — wraps shadcn's `Sidebar` primitives with `collapsible="icon"`, driven by two static arrays (`mainItems`, `analyticsItems`) rendered through `NavLink`. It is mounted on exactly **two** pages: `Dashboard.tsx` and `InterviewSetup.tsx`.

**`TabWrapper.tsx`** — a sticky back-to-dashboard header plus a framer-motion fade-in. (It uses some of the dead class names from Phase 2.)

The result is inconsistent navigation: sidebar on the dashboard, a back button on some sub-pages, nothing on others. Hoisting one layout into a React Router **layout route** with `<Outlet />` would unify it and let the sidebar keep its collapsed state across navigation:

```tsx
<Route element={<ProtectedLayout />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/dashboard/progress" element={<Progress />} />
</Route>
```

That is the single highest-value structural refactor available in the frontend.

---

## 🧠 Check your understanding

1. Why must `AuthProvider` sit inside `BrowserRouter`?
2. Why are the toasters rendered above the router rather than inside pages?
3. What specifically does the `loading` state in `ProtectedRoute` prevent?
4. What does `state={{ from: location }}` enable, and why `replace`?
5. Why is a client-side route guard not a security control?
6. Name three concrete things lost by not using the TanStack Query already installed.
7. What would a layout route with `<Outlet />` fix?

---

**Next:** [Phase 4 — Authentication](PHASE_04_auth.md)
