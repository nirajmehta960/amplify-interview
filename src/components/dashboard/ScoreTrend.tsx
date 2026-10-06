import { useReducedMotion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_HIGH_MIN, SCORE_LOW_MAX } from "@/lib/score";
import { LoadError } from "./LoadError";
import type { ProgressData } from "./useDashboardData";

const CARD = "rounded-2xl border border-border bg-card p-6 shadow-[var(--card-shadow)]";
const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

/**
 * Last ten interview scores, oldest to newest, with the shared score bands.
 * The lines mark bands, not a promise: the engine adapts difficulty inside an
 * interview on recent answers, and the next interview starts at the level the
 * user picks.
 */
export function ScoreTrend({
  loading,
  timeline,
  error = false,
}: {
  loading: boolean;
  timeline: ProgressData["score_timeline"] | undefined;
  error?: boolean;
}) {
  const animate = !useReducedMotion();
  const points = [...(timeline ?? [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map((p, i) => ({ n: i + 1, score: Math.round(p.score) }));

  return (
    <section aria-labelledby="score-trend-heading" className={CARD}>
      <h2 id="score-trend-heading" className="text-lg font-semibold">
        Recent scores
      </h2>
      <p className="text-sm text-muted-foreground">Each point is one interview's overall score.</p>
      {error ? (
        <LoadError className="mt-6" message="We couldn't load your scores." />
      ) : loading ? (
        <Skeleton className="mt-6 h-[180px]" />
      ) : points.length < 2 ? (
        <p className="mt-6 rounded-xl bg-secondary/50 p-6 text-center text-sm text-muted-foreground">
          Complete two interviews to see your trend.
        </p>
      ) : (
        <>
          <p className="sr-only">Scores, oldest to newest: {points.map((p) => p.score).join(", ")}.</p>
          {/* Band names live here, not on the lines, where they sat on top of the data. */}
          <ul aria-hidden="true" className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {[
              { label: `Strong (${SCORE_HIGH_MIN}+)`, stroke: "hsl(var(--score-high))" },
              { label: `Needs work (${SCORE_LOW_MAX} and below)`, stroke: "hsl(var(--score-low))" },
            ].map((band) => (
              <li key={band.label} className="inline-flex items-center gap-1.5">
                <svg width="16" height="4">
                  <line x1="0" y1="2" x2="16" y2="2" stroke={band.stroke} strokeWidth="2" strokeDasharray="4 3" />
                </svg>
                {band.label}
              </li>
            ))}
          </ul>
          <div aria-hidden="true" className="mt-3 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="n" tick={false} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, SCORE_LOW_MAX, SCORE_HIGH_MIN, 100]}
                  tick={AXIS}
                  axisLine={false}
                  tickLine={false}
                />
                <ReferenceLine y={SCORE_HIGH_MIN} stroke="hsl(var(--score-high))" strokeDasharray="4 4" />
                <ReferenceLine y={SCORE_LOW_MAX} stroke="hsl(var(--score-low))" strokeDasharray="4 4" />
                <ChartTooltip formatter={(value: number) => [value, "Score"]} labelFormatter={() => ""} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={animate} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}
