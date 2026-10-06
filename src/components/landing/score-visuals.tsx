import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * The overall-score ring and the per-criterion bars, coloured by the shared
 * score scale. Used by the landing's example band and the auth panel. Both
 * read band tokens, so they must sit inside a light `[data-band]`.
 */
export function ScoreRing({ score, className }: { score: number; className?: string }) {
  const band = scoreBand(score);
  return (
    <span
      role="img"
      aria-label={`Score ${score} out of 100`}
      data-score-band={band}
      className={cn("grid size-16 shrink-0 place-items-center rounded-full", className)}
      style={{ background: `conic-gradient(${SCORE_COLORS[band].fill} 0 ${score}%, hsl(var(--border)) 0)` }}
    >
      <span
        aria-hidden="true"
        className="grid size-[52px] place-items-center rounded-full bg-band-raised text-lg font-semibold tabular-nums text-band-fg"
      >
        {score}
      </span>
    </span>
  );
}

export function CriterionBar({ label, score }: { label: string; score: number }) {
  const band = scoreBand(score);
  return (
    <li data-score-band={band} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm">
      <span className="text-band-muted">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-pill bg-band-fg/10">
        <span className="block h-full rounded-pill" style={{ width: `${score}%`, background: SCORE_COLORS[band].fill }} />
      </span>
      <span className="text-right font-semibold tabular-nums" style={{ color: SCORE_COLORS[band].text }}>
        {score}
      </span>
    </li>
  );
}
