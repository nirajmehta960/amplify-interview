import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "./LoadError";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)]";

/** The top improvement themes from the analytics API — real feedback, not advice we invent. */
export function FocusNext({
  loading,
  improvements,
  error = false,
}: {
  loading: boolean;
  improvements: { item: string; count: number }[] | undefined;
  error?: boolean;
}) {
  const items = (improvements ?? []).slice(0, 3);
  return (
    <section aria-labelledby="focus-next-heading" className={CARD}>
      <h2 id="focus-next-heading" className="text-lg font-semibold">
        Focus next
      </h2>
      <p className="text-sm text-muted-foreground">Themes that came up most in your feedback.</p>
      {error ? (
        <LoadError className="mt-5" message="We couldn't load your feedback themes." />
      ) : loading ? (
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
      {/* Only when there is something to practise. Interviews, not the question bank, are where themes get worked on. */}
      {!error && !loading && items.length > 0 ? (
        <Link
          to="/interview/setup"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Practise these in a new interview
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}
