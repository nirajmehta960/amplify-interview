import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChatMessage, SessionFeedback } from "@/services/apiClient";
import { DifficultyChip } from "./DifficultyChip";
import { buildRadarData, pairQuestions } from "./results";
import { ScoreBadge } from "./ScoreBadge";

describe("ScoreBadge", () => {
  it.each([
    [82, "high"],
    [60, "mid"],
    [30, "low"],
  ] as const)("colours %d by the shared scale (%s)", (score, band) => {
    render(<ScoreBadge score={score} />);
    expect(screen.getByText(String(score))).toHaveAttribute("data-score-band", band);
  });

  it("shows a dash for a missing score", () => {
    render(<ScoreBadge score={null} />);
    expect(screen.getByText("—")).not.toHaveAttribute("data-score-band");
  });

  it("can append /100", () => {
    render(<ScoreBadge score={74} outOf />);
    expect(screen.getByText("74/100")).toBeInTheDocument();
  });
});

describe("DifficultyChip", () => {
  it.each([
    ["easy", 1],
    ["medium", 2],
    ["hard", 3],
  ] as const)("shows %s as %d filled bars, not as a score colour", (level, bars) => {
    const { container } = render(<DifficultyChip level={level} />);
    expect(screen.getByText(new RegExp(level, "i"))).toBeInTheDocument();
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(bars);
    expect(container.querySelector("[data-score-band]")).toBeNull();
  });

  it("falls back to medium for an unknown level", () => {
    const { container } = render(<DifficultyChip level="extreme" />);
    expect(container.querySelectorAll("[data-filled]")).toHaveLength(2);
  });
});

describe("buildRadarData", () => {
  const feedback = {
    overall_score: 77,
    communication_scores: { clarity: 70, structure: 80, conciseness: 65 },
    content_scores: { relevance: 90, depth: 60, specificity: 75 },
  } as SessionFeedback;

  it("plots exactly the six real dimensions — never the overall score under another name", () => {
    expect(buildRadarData(feedback)).toEqual([
      { subject: "Clarity", score: 70 },
      { subject: "Structure", score: 80 },
      { subject: "Conciseness", score: 65 },
      { subject: "Relevance", score: 90 },
      { subject: "Depth", score: 60 },
      { subject: "Specificity", score: 75 },
    ]);
  });
});

describe("pairQuestions", () => {
  const m = (role: ChatMessage["role"], content: string): ChatMessage => ({ role, content });

  it("pairs each question with the answer that follows it", () => {
    const pairs = pairQuestions([m("interviewer", "Q1"), m("candidate", "A1"), m("interviewer", "Q2")]);
    expect(pairs.map((p) => [p.question.content, p.answer?.content ?? null])).toEqual([
      ["Q1", "A1"],
      ["Q2", null],
    ]);
  });

  it("ignores system messages", () => {
    expect(pairQuestions([m("system", "hi"), m("interviewer", "Q1")])).toHaveLength(1);
  });
});
