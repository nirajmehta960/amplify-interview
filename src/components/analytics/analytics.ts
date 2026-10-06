import { trendLabel, type TrendInfo } from "@/components/dashboard/format";
import { SCORE_HIGH_MIN, SCORE_LOW_MAX } from "@/lib/score";

/**
 * Pure shaping for Progress and Insights. Every function here reports only
 * what routers/analytics.py actually returned: no defaults dressed up as
 * measurements (the old pages showed a consistency of 100 and three invented
 * strengths to an account with no interviews).
 */

export interface TimelinePoint {
  date: string;
  score: number;
  mode: string;
  readiness: string;
}

export interface CommunicationPoint {
  date: string;
  clarity: number;
  structure: number;
  conciseness: number;
}

export interface Theme {
  item: string;
  count: number;
}

export interface AnalyticsOverview {
  completed_sessions?: number;
  average_score?: number;
  performance_trend?: string;
  readiness_distribution?: Record<string, number>;
}

export interface AnalyticsProgress {
  score_timeline?: TimelinePoint[];
  communication_timeline?: CommunicationPoint[];
  top_strengths?: Theme[];
  top_improvements?: Theme[];
}

export interface AnalyticsSkills {
  resume_skills?: string[];
  skills_demonstrated?: string[];
  skills_to_practice?: string[];
}

/** Scored interviews the spread of scores needs before it says anything. */
export const CONSISTENCY_MIN_SCORED = 3;

const byDate = <T extends { date: string }>(a: T, b: T) => new Date(a.date).getTime() - new Date(b.date).getTime();

const sentenceCase = (s: string) => {
  const spaced = s.replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : spaced;
};

/**
 * Interviews with a score, oldest first. A completed interview stays at 0
 * until its results page generates feedback, so a 0 is "not scored", not a score.
 */
export function scoredTimeline(timeline: TimelinePoint[] | undefined): TimelinePoint[] {
  return (timeline ?? []).filter((p) => p.score > 0).sort(byDate);
}

export interface SummaryStats {
  scored: number;
  average: number | null;
  best: number | null;
  trend: TrendInfo;
}

export function summaryStats(overview: AnalyticsOverview | null, scored: TimelinePoint[]): SummaryStats {
  const count = scored.length;
  return {
    scored: count,
    average: count > 0 ? Math.round(overview?.average_score ?? 0) : null,
    best: count > 0 ? Math.max(...scored.map((p) => p.score)) : null,
    trend: trendLabel(overview?.performance_trend, count),
  };
}

/** Standard deviation of overall scores, in points; null below CONSISTENCY_MIN_SCORED. */
export function consistency(scored: TimelinePoint[]): number | null {
  if (scored.length < CONSISTENCY_MIN_SCORED) return null;
  const scores = scored.map((p) => p.score);
  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  return Math.round(Math.sqrt(variance));
}

export interface ModeAverage {
  mode: string;
  label: string;
  average: number;
  count: number;
}

export function modeAverages(scored: TimelinePoint[]): ModeAverage[] {
  const groups = new Map<string, number[]>();
  for (const p of scored) groups.set(p.mode, [...(groups.get(p.mode) ?? []), p.score]);
  return [...groups.entries()]
    .map(([mode, scores]) => ({
      mode,
      label: sentenceCase(mode),
      average: Math.round(scores.reduce((s, v) => s + v, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.count - a.count || b.average - a.average);
}

/** Clarity, structure and conciseness per interview — the only communication scores the backend keeps. */
export function communicationSeries(timeline: CommunicationPoint[] | undefined) {
  return [...(timeline ?? [])].sort(byDate).map((p, i) => ({
    n: i + 1,
    clarity: Math.round(p.clarity),
    structure: Math.round(p.structure),
    conciseness: Math.round(p.conciseness),
  }));
}

/** Feedback themes as the API counted them. Empty stays empty. */
export function recurring(themes: Theme[] | undefined, limit = 5): Theme[] {
  return (themes ?? []).slice(0, limit).map((t) => ({ item: sentenceCase(t.item), count: t.count }));
}

export function mostCommonReadiness(distribution: Record<string, number> | undefined): string | null {
  const known = Object.entries(distribution ?? {}).filter(([level, n]) => level.toLowerCase() !== "unknown" && n > 0);
  if (known.length === 0) return null;
  return sentenceCase(known.sort((a, b) => b[1] - a[1])[0][0]);
}

export interface Milestone {
  title: string;
  description: string;
  achieved: boolean;
}

export function milestones(overview: AnalyticsOverview | null, scored: TimelinePoint[]): Milestone[] {
  const completed = overview?.completed_sessions ?? 0;
  const average = overview?.average_score ?? 0;
  const ready = Object.entries(overview?.readiness_distribution ?? {}).some(
    ([level, n]) => level.replace(/_/g, " ").toLowerCase() === "interview ready" && n > 0,
  );
  return [
    { title: "First interview", description: "Complete your first mock interview", achieved: completed >= 1 },
    { title: "Three interviews", description: "Complete three interviews", achieved: completed >= 3 },
    {
      title: "Strong average",
      description: `Average ${SCORE_HIGH_MIN} or higher`,
      achieved: scored.length > 0 && average >= SCORE_HIGH_MIN,
    },
    { title: "Interview ready", description: "Reach “Interview Ready” in a session", achieved: ready },
    { title: "Ten interviews", description: "Complete ten interviews", achieved: completed >= 10 },
    { title: "Top score", description: "Score 95 or higher in one interview", achieved: scored.some((p) => p.score >= 95) },
  ];
}

/** One next step, from the same score scale the interview engine adapts on. */
export function nextGoal(overview: AnalyticsOverview | null, scoredCount: number): string {
  if ((overview?.completed_sessions ?? 0) === 0) return "Complete your first interview.";
  if (scoredCount === 0) return "Open your latest results so the interview gets scored.";
  const average = overview?.average_score ?? 0;
  if (average <= SCORE_LOW_MAX) return `Lift your average above ${SCORE_LOW_MAX}.`;
  if (average < SCORE_HIGH_MIN) return `Reach a ${SCORE_HIGH_MIN}+ average — the strong band.`;
  return `Keep your average at ${SCORE_HIGH_MIN}+ as questions get harder.`;
}
