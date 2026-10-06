import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "./LoadError";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)] sm:p-8";
const GET_STARTED = ["Add your résumé and the job", "Take an adaptive interview", "Review your scored feedback"];

export function WelcomeCard({
  loading,
  name,
  status,
  hasSessions,
  error = false,
  onRetry,
}: {
  loading: boolean;
  name: string;
  status: string;
  hasSessions: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  if (loading) return <Skeleton aria-label="Loading" className="h-[168px] rounded-2xl" />;

  // A failed load must not pass for a brand-new account.
  if (error) {
    return (
      <section aria-labelledby="welcome-heading" className={CARD}>
        <h2 id="welcome-heading" className="text-xl font-semibold tracking-[-0.01em]">
          Welcome back, {name}
        </h2>
        <LoadError className="mt-4" message="We couldn't load your interviews just now." onRetry={onRetry} />
      </section>
    );
  }

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
