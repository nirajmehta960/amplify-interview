import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * A score on the shared 45/78 scale: tinted pill, band-coloured number.
 * Every interview screen uses this, so a score never changes colour between
 * the chat, the progress panel, the results and the dashboard.
 */
export function ScoreBadge({
  score,
  outOf = false,
  size = "md",
  className,
}: {
  score: number | null | undefined;
  outOf?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };
  if (score === null || score === undefined) {
    return (
      <span className={cn("inline-flex rounded-full bg-secondary font-semibold tabular-nums text-muted-foreground", sizes[size], className)}>
        —
      </span>
    );
  }
  const rounded = Math.round(score);
  const band = scoreBand(rounded);
  return (
    <span
      data-score-band={band}
      className={cn("inline-flex rounded-full font-semibold tabular-nums", sizes[size], className)}
      style={{
        color: SCORE_COLORS[band].text,
        background: `color-mix(in srgb, ${SCORE_COLORS[band].fill} 14%, transparent)`,
      }}
    >
      {outOf ? `${rounded}/100` : rounded}
    </span>
  );
}
