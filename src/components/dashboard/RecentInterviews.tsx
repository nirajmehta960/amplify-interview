import { ChevronRight, RefreshCw, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS, scoreBand } from "@/lib/score";
import type { SessionListItem } from "@/services/apiClient";
import { formatSessionDate } from "./format";
import { LoadError } from "./LoadError";

/** Latest sessions. Every row is a real link to its results, as the old row button was. */
export function RecentInterviews({
  loading,
  sessions,
  onRefresh,
  error = false,
}: {
  loading: boolean;
  sessions: SessionListItem[];
  onRefresh: () => void;
  error?: boolean;
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

      {error ? (
        <div className="p-6">
          <LoadError message="We couldn't load your interviews." onRetry={onRefresh} />
        </div>
      ) : loading ? (
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
