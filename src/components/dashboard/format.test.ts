import { describe, expect, it } from "vitest";
import type { SessionListItem } from "@/services/apiClient";
import { displayName, formatSessionDate, practiceStreak, statusLine, trendLabel } from "./format";

const session = (over: Partial<SessionListItem>): SessionListItem => ({
  session_id: "s",
  status: "completed",
  mode: "behavioral",
  created_at: "2026-10-01T10:00:00Z",
  question_count: 8,
  ...over,
});

describe("trendLabel", () => {
  it("says not enough data below six scored interviews, whatever the backend says", () => {
    // routers/analytics.py only compares recent vs older scores with >= 6 scored
    // sessions; below that it always returns "consistent".
    expect(trendLabel("consistent", 0)).toEqual({ label: "Not enough data", direction: "flat" });
    expect(trendLabel("consistent", 3)).toEqual({ label: "Not enough data", direction: "flat" });
    expect(trendLabel("improving", 5)).toEqual({ label: "Not enough data", direction: "flat" });
  });

  it.each([
    ["improving", "Improving", "up"],
    ["consistent", "Steady", "flat"],
    ["declining", "Declining", "down"],
    ["IMPROVING", "Improving", "up"],
    ["something-new", "Not enough data", "flat"],
    [undefined, "Not enough data", "flat"],
  ] as const)("maps %s", (trend, label, direction) => {
    expect(trendLabel(trend, 6)).toEqual({ label, direction });
  });

  it("never reports a percentage", () => {
    for (const t of ["improving", "consistent", "declining"]) {
      expect(trendLabel(t, 6).label).not.toMatch(/%/);
    }
  });
});

describe("practiceStreak", () => {
  const today = new Date("2026-10-06T12:00:00");
  const day = (d: string) => ({ date: `${d}T09:00:00` });

  it("counts consecutive days ending today", () => {
    expect(practiceStreak([day("2026-10-06"), day("2026-10-05"), day("2026-10-04")], today)).toBe(3);
  });

  it("counts several sessions on one day once", () => {
    expect(practiceStreak([day("2026-10-06"), day("2026-10-06"), day("2026-10-05")], today)).toBe(2);
  });

  it("stops at the first gap", () => {
    expect(practiceStreak([day("2026-10-06"), day("2026-10-04")], today)).toBe(1);
  });

  it("is zero when nothing happened today", () => {
    expect(practiceStreak([day("2026-10-05")], today)).toBe(0);
  });

  it("is zero with no timeline", () => {
    expect(practiceStreak(undefined, today)).toBe(0);
    expect(practiceStreak([], today)).toBe(0);
  });
});

describe("statusLine", () => {
  it("describes the most recent scored interview with the shared verdicts", () => {
    const sessions = [
      session({ session_id: "a", created_at: "2026-10-01T10:00:00Z", overall_score: 60 }),
      session({ session_id: "b", created_at: "2026-10-03T10:00:00Z", overall_score: 82.4 }),
      session({ session_id: "c", created_at: "2026-10-04T10:00:00Z" }),
    ];
    expect(statusLine(sessions)).toBe("Your last interview scored 82 · Strong answer");
  });

  it("uses the mid and low verdicts", () => {
    expect(statusLine([session({ overall_score: 60 })])).toBe("Your last interview scored 60 · Solid, with room to grow");
    expect(statusLine([session({ overall_score: 30 })])).toBe("Your last interview scored 30 · Needs work");
  });

  it("says so when nothing has been scored", () => {
    expect(statusLine([])).toBe("No completed interviews yet.");
    expect(statusLine([session({ overall_score: 0 })])).toBe("No completed interviews yet.");
  });
});

describe("displayName", () => {
  it("prefers the profile, then the auth name, then the email handle", () => {
    expect(displayName({ uid: "u", display_name: "Ada" }, { displayName: "A. L." })).toBe("Ada");
    expect(displayName(null, { displayName: "A. L.", email: "ada@x.com" })).toBe("A. L.");
    expect(displayName(null, { email: "ada@x.com" })).toBe("ada");
    expect(displayName(null, null)).toBe("there");
  });
});

describe("formatSessionDate", () => {
  it("formats a valid timestamp", () => {
    expect(formatSessionDate("2026-10-03T10:00:00Z")).toMatch(/Oct 2026/);
  });

  it("returns an empty string instead of throwing on a malformed timestamp", () => {
    expect(formatSessionDate("not-a-date")).toBe("");
    expect(formatSessionDate("")).toBe("");
  });
});
