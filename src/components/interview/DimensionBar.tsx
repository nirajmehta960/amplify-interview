import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";

/** One rubric dimension: label, value and a bar, all coloured by the shared score scale. */
export function DimensionBar({ label, value, className }: { label: string; value: number; className?: string }) {
  const band = scoreBand(value);
  return (
    <div data-score-band={band} className={cn("flex-1", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="capitalize">{label}</span>
        <span className="font-medium tabular-nums" style={{ color: SCORE_COLORS[band].text }}>
          {value}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: SCORE_COLORS[band].fill }} />
      </div>
    </div>
  );
}
