import { describe, expect, it } from "vitest";
import {
  CONSISTENCY_MIN_SCORED,
  communicationSeries,
  consistency,
  milestones,
  modeAverages,
  mostCommonReadiness,
  nextGoal,
  recurring,
  scoredTimeline,
  summaryStats,
} from "./analytics";

const point = (date: string, score: number, mode = "behavioral") => ({ date, score, mode, readiness: "Nearly Ready" });

describe("scoredTimeline", () => {
  it("keeps scored interviews only, oldest first", () => {
    const t = scoredTimeline([point("2026-10-03", 70), point("2026-10-01", 0), point("2026-10-02", 60)]);
    expect(t.map((p) => p.score)).toEqual([60, 70]);
  });

  it("is empty for a missing timeline", () => {
    expect(scoredTimeline(undefined)).toEqual([]);
  });
});

describe("summaryStats", () => {
  it("shows nothing for a new account rather than zeros", () => {
    expect(summaryStats(null, [])).toEqual({
      scored: 0,
      average: null,
      best: null,
      trend: { label: "Not enough data", direction: "flat" },
    });
  });

  it("reports the average and best once something is scored", () => {
    const s = summaryStats({ average_score: 71.6, performance_trend: "consistent" }, [point("a", 64), point("b", 80)]);
    expect(s).toMatchObject({ scored: 2, average: 72, best: 80 });
  });

  it("only names a trend from six scored interviews", () => {
    const six = Array.from({ length: 6 }, (_, i) => point(`2026-10-0${i + 1}`, 70));
    expect(summaryStats({ average_score: 70, performance_trend: "improving" }, six).trend.label).toBe("Improving");
    expect(summaryStats({ average_score: 70, performance_trend: "improving" }, six.slice(1)).trend.label).toBe(
      "Not enough data",
    );
  });
});

describe("consistency", () => {
  it(`needs ${CONSISTENCY_MIN_SCORED} scored interviews — never a default 100`, () => {
    expect(consistency([point("a", 70), point("b", 72)])).toBeNull();
    expect(consistency([])).toBeNull();
  });

  it("is the spread of scores in points", () => {
    expect(consistency([point("a", 60), point("b", 70), point("c", 80)])).toBe(8);
  });
});

describe("modeAverages", () => {
  it("averages each interview type, most practised first", () => {
    const rows = modeAverages([point("a", 60, "technical"), point("b", 80, "behavioral"), point("c", 70, "behavioral")]);
    expect(rows).toEqual([
      { mode: "behavioral", label: "Behavioral", average: 75, count: 2 },
      { mode: "technical", label: "Technical", average: 60, count: 1 },
    ]);
  });
});

describe("communicationSeries", () => {
  it("keeps the three real dimensions, oldest first", () => {
    const rows = communicationSeries([
      { date: "2026-10-02", clarity: 70, structure: 60, conciseness: 50 },
      { date: "2026-10-01", clarity: 40, structure: 45, conciseness: 55 },
    ]);
    expect(rows.map((r) => r.clarity)).toEqual([40, 70]);
    expect(Object.keys(rows[0]).sort()).toEqual(["clarity", "conciseness", "n", "structure"]);
  });
});

describe("recurring", () => {
  it("passes through real themes with their counts and invents none", () => {
    expect(recurring(undefined)).toEqual([]);
    expect(recurring([{ item: "quantify outcomes", count: 3 }])).toEqual([{ item: "Quantify outcomes", count: 3 }]);
  });
});

describe("mostCommonReadiness", () => {
  it("names the most frequent known level", () => {
    expect(mostCommonReadiness({ "Nearly Ready": 2, unknown: 5, "Interview Ready": 1 })).toBe("Nearly Ready");
    expect(mostCommonReadiness({ interview_ready: 1 })).toBe("Interview ready");
  });

  it("is null when nothing is known", () => {
    expect(mostCommonReadiness(undefined)).toBeNull();
    expect(mostCommonReadiness({ unknown: 3 })).toBeNull();
  });
});

describe("milestones", () => {
  it("earns nothing on a new account", () => {
    expect(milestones(null, []).filter((m) => m.achieved)).toEqual([]);
  });

  it("earns each milestone from real data only", () => {
    const earned = milestones(
      { completed_sessions: 3, average_score: 79, readiness_distribution: { "Interview Ready": 1 } },
      [point("a", 70), point("b", 96), point("c", 71)],
    )
      .filter((m) => m.achieved)
      .map((m) => m.title);
    expect(earned).toEqual(["First interview", "Three interviews", "Strong average", "Interview ready", "Top score"]);
  });

  it("does not award a strong average before anything is scored", () => {
    const strong = milestones({ completed_sessions: 1, average_score: 90 }, []).find((m) => m.title === "Strong average");
    expect(strong?.achieved).toBe(false);
  });
});

describe("nextGoal", () => {
  it("follows the account from first interview to the strong band", () => {
    expect(nextGoal(null, 0)).toBe("Complete your first interview.");
    expect(nextGoal({ completed_sessions: 1, average_score: 0 }, 0)).toBe(
      "Open your latest results so the interview gets scored.",
    );
    expect(nextGoal({ completed_sessions: 2, average_score: 40 }, 2)).toBe("Lift your average above 45.");
    expect(nextGoal({ completed_sessions: 2, average_score: 60 }, 2)).toBe("Reach a 78+ average — the strong band.");
    expect(nextGoal({ completed_sessions: 2, average_score: 85 }, 2)).toBe("Keep your average at 78+ as questions get harder.");
  });
});
