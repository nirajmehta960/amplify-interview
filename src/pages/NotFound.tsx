import { Mic } from "lucide-react";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/** The catch-all route: says what was missing and offers the way back that fits who is looking. */
const NotFound = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-4 sm:px-6">
      <Helmet>
        <title>Page not found — Amplify Interview</title>
      </Helmet>
      <header className="mx-auto flex w-full max-w-[1200px] items-center py-5">
        <Link to="/" className="flex items-center gap-2.5 rounded-md text-[0.9375rem] font-semibold text-foreground">
          <span className="grid size-8 place-items-center rounded-[9px] bg-accent text-accent-foreground">
            <Mic className="size-4" aria-hidden="true" />
          </span>
          Amplify Interview
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center pb-24">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--card-shadow)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Error 404</p>
          <h1 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground">We couldn't find that page</h1>
          <p className="mt-3 text-muted-foreground">
            Nothing lives at{" "}
            <code className="break-all rounded-md bg-secondary px-1.5 py-0.5 text-sm text-foreground">{location.pathname}</code>. The
            link may be old, or the page may have moved.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {user ? (
              <>
                <Button asChild>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">Back to home</Link>
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link to="/">Back to home</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
