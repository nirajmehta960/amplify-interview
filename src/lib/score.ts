/**
 * The score scale every screen colours answers by.
 *
 * The thresholds mirror `backend/app/services/interview_engine.py`
 * (DIFFICULTY_DOWN_THRESHOLD = 45, DIFFICULTY_UP_THRESHOLD = 78, both inclusive):
 * the colour a user sees is the same signal the engine adapts difficulty on.
 * Change them there and here together.
 */
export const SCORE_LOW_MAX = 45;
export const SCORE_HIGH_MIN = 78;

export type ScoreBand = "low" | "mid" | "high";

export function scoreBand(score: number): ScoreBand {
  if (score >= SCORE_HIGH_MIN) return "high";
  if (score <= SCORE_LOW_MAX) return "low";
  return "mid";
}

/**
 * `fill` for rings, bars and dots; `text` for small type on light grounds
 * (each ≥ 4.5:1 on cream and white). Values live in src/index.css.
 */
export const SCORE_COLORS: Record<ScoreBand, { fill: string; text: string }> = {
  low: { fill: "hsl(var(--score-low))", text: "hsl(var(--score-low-text))" },
  mid: { fill: "hsl(var(--score-mid))", text: "hsl(var(--score-mid-text))" },
  high: { fill: "hsl(var(--score-high))", text: "hsl(var(--score-high-text))" },
};
