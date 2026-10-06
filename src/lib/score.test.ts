import { describe, expect, it } from "vitest";
import { SCORE_COLORS, SCORE_HIGH_MIN, SCORE_LOW_MAX, scoreBand } from "./score";

describe("scoreBand", () => {
  it("mirrors the interview engine's difficulty-adaptation thresholds", () => {
    expect(SCORE_LOW_MAX).toBe(45);
    expect(SCORE_HIGH_MIN).toBe(78);
  });

  it.each([
    [0, "low"],
    [45, "low"],
    [46, "mid"],
    [77, "mid"],
    [78, "high"],
    [100, "high"],
  ] as const)("scores %d as %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });

  it("classifies fractional scores by value, not by rounding", () => {
    expect(scoreBand(45.5)).toBe("mid");
    expect(scoreBand(77.9)).toBe("mid");
  });

  it("exposes a fill and a text colour for every band", () => {
    for (const band of ["low", "mid", "high"] as const) {
      expect(SCORE_COLORS[band].fill).toBe(`hsl(var(--score-${band}))`);
      expect(SCORE_COLORS[band].text).toBe(`hsl(var(--score-${band}-text))`);
    }
  });
});
