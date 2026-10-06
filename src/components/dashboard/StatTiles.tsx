import { Flame, Target, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS, scoreBand, type ScoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import { trendIcon, trendLabel } from "./format";
import { LoadError } from "./LoadError";
import type { OverviewData } from "./useDashboardData";

const CARD = "rounded-2xl border border-border bg-card p-5 shadow-[var(--card-shadow)]";

/** Four real numbers. No estimates: a new user sees "—" and "Not enough data". */
export function StatTiles({
  loading,
  overview,
  streak,
  error = false,
  onRetry,
}: {
  loading: boolean;
  overview: OverviewData | null;
  streak: number;
  error?: boolean;
  onRetry?: () => void;
}) {
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

  if (error) return <LoadError message="We couldn't load your stats." onRetry={onRetry} />;

  const completed = overview?.completed_sessions ?? 0;
  // "Scored" is what the average and trend are computed from. A completed
  // interview has no score until its results are generated, so completed > 0
  // with nothing scored must read "—", not a red 0.
  const scored = overview?.recent_scores?.length ?? 0;
  const average = scored > 0 ? Math.round(overview?.average_score ?? 0) : null;
  const band: ScoreBand | undefined = average === null ? undefined : scoreBand(average);
  const trend = trendLabel(overview?.performance_trend, scored);
  const TrendIcon = trendIcon(trend);

  const tiles = [
    { label: "Interviews completed", value: String(completed), icon: Video, band: undefined },
    { label: "Average score", value: average === null ? "—" : String(average), icon: Target, band },
    { label: "Trend", value: trend.label, icon: TrendIcon, band: undefined },
    { label: "Practice streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, icon: Flame, band: undefined },
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
