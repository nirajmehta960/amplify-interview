import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FEATURES, SAMPLE } from "./content";
import { Features } from "./features";
import { SampleFeedback } from "./sample-feedback";

describe("Features", () => {
  it("renders six cards, each titled by an h3", () => {
    render(<Features />);
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(
      FEATURES.cards.map((card) => card.title),
    );
  });
});

describe("SampleFeedback", () => {
  it("is visibly badged as an example", () => {
    render(<SampleFeedback />);
    expect(screen.getByText(SAMPLE.badge)).toBeInTheDocument();
  });

  it("colours the overall score and each criterion by the shared score scale", () => {
    render(<SampleFeedback />);
    expect(screen.getByRole("img", { name: "Score 82 out of 100" })).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("Clarity").closest("li")).toHaveAttribute("data-score-band", "mid");
    expect(screen.getByText("Structure").closest("li")).toHaveAttribute("data-score-band", "high");
  });

  it("keeps every example score inside 0–100", () => {
    for (const score of [SAMPLE.overall, ...SAMPLE.criteria.map((c) => c.score)]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
