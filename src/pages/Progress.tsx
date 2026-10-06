import { CheckCircle2, Circle, Hash, Target, Trophy } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  communicationSeries,
  milestones as buildMilestones,
  modeAverages,
  scoredTimeline,
  summaryStats,
} from "@/components/analytics/analytics";
import { AXIS } from "@/components/analytics/styles";
import { EmptyNote, Section, StatTileRow, StatTileSkeleton } from "@/components/analytics/ui";
import { useAnalytics } from "@/components/analytics/useAnalytics";
import { trendIcon } from "@/components/dashboard/format";
import { LoadError } from "@/components/dashboard/LoadError";
import { DimensionBar } from "@/components/interview/DimensionBar";
import { PageContainer, PageHeader } from "@/components/shell/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS, SCORE_HIGH_MIN, SCORE_LOW_MAX, scoreBand } from "@/lib/score";

const SERIES = [
  { key: "clarity", label: "Clarity", stroke: "hsl(var(--accent))", dash: undefined },
  { key: "structure", label: "Structure", stroke: "hsl(var(--foreground))", dash: undefined },
  { key: "conciseness", label: "Conciseness", stroke: "hsl(var(--muted-foreground))", dash: "5 4" },
] as const;

/** A score-history dot in its score band's colour. */
function BandDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: { score: number } }) {
  if (cx == null || cy == null || !payload) return null;
  return (
    <circle cx={cx} cy={cy} r={4} fill={SCORE_COLORS[scoreBand(payload.score)].fill} stroke="hsl(var(--card))" strokeWidth={1.5} />
  );
}

const Progress = () => {
  const { loading, error, overview, progress, retry } = useAnalytics();
  // Recharts animates regardless of the OS setting; honour it here.
  const animate = !useReducedMotion();

  const scored = scoredTimeline(progress?.score_timeline);
  const stats = summaryStats(overview, scored);
  const history = scored.map((p, i) => ({ n: i + 1, score: Math.round(p.score) }));
  const communication = communicationSeries(progress?.communication_timeline);
  const byType = modeAverages(scored);
  const earned = buildMilestones(overview, scored);
  const TrendIcon = trendIcon(stats.trend);

  return (
    <PageContainer>
      <Helmet>
        <title>Progress — Amplify Interview</title>
      </Helmet>
      <PageHeader title="Progress" subtitle="How your scores are moving over time." />

      {error ? (
        <LoadError className="mt-8" message="We couldn't load your progress." onRetry={retry} />
      ) : loading ? (
        <div className="mt-8 space-y-6" role="status" aria-label="Loading progress">
          <StatTileSkeleton count={4} />
          <Skeleton className="h-[300px] rounded-2xl" />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <StatTileRow
            tiles={[
              { label: "Average score", value: stats.average === null ? "—" : String(stats.average), icon: Target, score: stats.average },
              { label: "Best score", value: stats.best === null ? "—" : String(Math.round(stats.best)), icon: Trophy, score: stats.best },
              { label: "Interviews scored", value: String(stats.scored), icon: Hash },
              { label: "Trend", value: stats.trend.label, icon: TrendIcon },
            ]}
          />

          <Section id="history" title="Score history" description="Each point is one interview's overall score, oldest to newest.">
            {history.length < 2 ? (
              <EmptyNote>Your scores chart here after two scored interviews.</EmptyNote>
            ) : (
              <>
                <p className="sr-only">Scores, oldest to newest: {history.map((p) => p.score).join(", ")}.</p>
                {/* Band names live here, not on the lines, where they collided with the data on phones. */}
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
                <div aria-hidden="true" className="mt-3 h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                      <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="n" tick={false} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} ticks={[0, SCORE_LOW_MAX, SCORE_HIGH_MIN, 100]} tick={AXIS} axisLine={false} tickLine={false} />
                      <ReferenceLine y={SCORE_HIGH_MIN} stroke="hsl(var(--score-high))" strokeDasharray="4 4" />
                      <ReferenceLine y={SCORE_LOW_MAX} stroke="hsl(var(--score-low))" strokeDasharray="4 4" />
                      <ChartTooltip formatter={(value: number) => [value, "Score"]} labelFormatter={() => ""} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={<BandDot />} activeDot={{ r: 5 }} isAnimationActive={animate} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section id="communication" title="Communication over time" description="Clarity, structure and conciseness in each interview.">
              {communication.length < 2 ? (
                <EmptyNote>These lines appear after two scored interviews.</EmptyNote>
              ) : (
                <>
                  <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {SERIES.map((s) => (
                      <li key={s.key} className="inline-flex items-center gap-1.5">
                        <svg width="16" height="4" aria-hidden="true">
                          <line x1="0" y1="2" x2="16" y2="2" stroke={s.stroke} strokeWidth="2.5" strokeDasharray={s.dash} />
                        </svg>
                        {s.label}
                      </li>
                    ))}
                  </ul>
                  <p className="sr-only">
                    Latest interview: clarity {communication[communication.length - 1].clarity}, structure{" "}
                    {communication[communication.length - 1].structure}, conciseness {communication[communication.length - 1].conciseness}.
                  </p>
                  <div aria-hidden="true" className="mt-3 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={communication} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                        <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="n" tick={false} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={AXIS} axisLine={false} tickLine={false} />
                        <ChartTooltip labelFormatter={() => ""} />
                        {SERIES.map((s) => (
                          <Line
                            key={s.key}
                            type="monotone"
                            dataKey={s.key}
                            name={s.label}
                            stroke={s.stroke}
                            strokeWidth={2}
                            strokeDasharray={s.dash}
                            dot={false}
                            isAnimationActive={animate}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Section>

            <Section id="by-type" title="By interview type" description="Average overall score for each kind of interview.">
              {byType.length === 0 ? (
                <EmptyNote>Scores by type appear after your first scored interview.</EmptyNote>
              ) : (
                <ul className="mt-5 space-y-4">
                  {byType.map((row) => (
                    <li key={row.mode}>
                      <DimensionBar label={row.label} value={row.average} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.count} {row.count === 1 ? "interview" : "interviews"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Section
            id="milestones"
            title="Milestones"
            description="Earned from your real interviews."
            aside={
              <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {earned.filter((m) => m.achieved).length} of {earned.length}
              </span>
            }
          >
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {earned.map((m) => (
                <li
                  key={m.title}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${m.achieved ? "border-border bg-card" : "border-dashed border-border bg-secondary/40"}`}
                >
                  {m.achieved ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" style={{ color: SCORE_COLORS.high.text }} aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${m.achieved ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.title}
                      <span className="sr-only">{m.achieved ? " (earned)" : " (not yet earned)"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </PageContainer>
  );
};

export default Progress;
