import { format } from "date-fns";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleDashed, type LucideIcon } from "lucide-react";
import { scoreBand, type ScoreBand } from "@/lib/score";
import type { SessionListItem, UserProfile } from "@/services/apiClient";

export type TrendDirection = "up" | "flat" | "down";
export interface TrendInfo {
  label: "Improving" | "Steady" | "Declining" | "Not enough data";
  direction: TrendDirection;
}

/**
 * Scored interviews the backend needs before `performance_trend` means anything:
 * routers/analytics.py compares the latest 5 scores with the 5 before them and
 * returns "consistent" until both groups exist.
 */
export const TREND_MIN_SCORED = 6;

/**
 * The backend's `performance_trend` as a word, never a number. Below
 * TREND_MIN_SCORED scored interviews its "consistent" is a default, not a
 * measurement, so the honest answer is "Not enough data".
 */
export function trendLabel(trend: string | undefined, scored: number): TrendInfo {
  if (scored < TREND_MIN_SCORED) return { label: "Not enough data", direction: "flat" };
  switch ((trend ?? "").toLowerCase()) {
    case "improving":
      return { label: "Improving", direction: "up" };
    case "consistent":
      return { label: "Steady", direction: "flat" };
    case "declining":
      return { label: "Declining", direction: "down" };
    default:
      return { label: "Not enough data", direction: "flat" };
  }
}

/** An arrow only for a measured trend; "Not enough data" gets a neutral mark. */
export function trendIcon(trend: TrendInfo): LucideIcon {
  if (trend.label === "Not enough data") return CircleDashed;
  return trend.direction === "up" ? ArrowUpRight : trend.direction === "down" ? ArrowDownRight : ArrowRight;
}

/** Consecutive practice days ending today. Moved unchanged from Dashboard.tsx. */
export function practiceStreak(timeline: { date: string }[] | undefined, today: Date = new Date()): number {
  if (!timeline?.length) return 0;
  const uniqueDays = [
    ...new Set(
      timeline.map((t) => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      }),
    ),
  ]
    .map((t) => new Date(t))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const checkDate = new Date(today);
  checkDate.setHours(0, 0, 0, 0);
  for (const day of uniqueDays) {
    const daysDiff = Math.floor((checkDate.getTime() - day.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === streak) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** One verdict per score band, shared with the landing's example card. */
export const VERDICT: Record<ScoreBand, string> = {
  high: "Strong answer",
  mid: "Solid, with room to grow",
  low: "Needs work",
};

export function statusLine(sessions: SessionListItem[]): string {
  const latest = sessions
    .filter((s) => typeof s.overall_score === "number" && s.overall_score > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (!latest) return "No completed interviews yet.";
  const score = Math.round(latest.overall_score as number);
  return `Your last interview scored ${score} · ${VERDICT[scoreBand(score)]}`;
}

export function displayName(
  profile: UserProfile | null,
  user: { displayName?: string | null; email?: string | null } | null,
): string {
  return profile?.display_name || user?.displayName || user?.email?.split("@")[0] || "there";
}

/** "3 Oct 2026", or "" for a timestamp date-fns cannot format (it would throw). */
export function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : format(date, "d MMM yyyy");
}
