import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Insights from "./Insights";

const api = vi.hoisted(() => ({ getOverview: vi.fn(), getProgress: vi.fn(), getSkills: vi.fn() }));
vi.mock("@/services/apiClient", () => ({ analyticsApi: api }));
const auth = vi.hoisted(() => ({ user: { uid: "u1" } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

const EMPTY_OVERVIEW = {
  total_sessions: 0,
  completed_sessions: 0,
  average_score: 0,
  performance_trend: "consistent",
  recent_scores: [],
  readiness_distribution: {},
  total_cost_cents: 0,
};
const EMPTY_PROGRESS = { score_timeline: [], communication_timeline: [], top_strengths: [], top_improvements: [] };
const EMPTY_SKILLS = { resume_skills: [], skills_demonstrated: [], skills_to_practice: [] };

const point = (date: string, score: number) => ({ date, score, mode: "behavioral", readiness: "Nearly Ready" });

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Insights />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const tile = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

beforeEach(() => {
  api.getOverview.mockReset().mockResolvedValue(EMPTY_OVERVIEW);
  api.getProgress.mockReset().mockResolvedValue(EMPTY_PROGRESS);
  api.getSkills.mockReset().mockResolvedValue(EMPTY_SKILLS);
});

describe("Insights", () => {
  it("has its h1 while loading", () => {
    api.getOverview.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Insights" })).toBeInTheDocument();
  });

  it("invents nothing for a new account", async () => {
    renderPage();
    await screen.findByText("Score consistency");
    expect(within(tile("Score consistency")).getByText("—")).toBeInTheDocument();
    expect(within(tile("Trend")).getByText("Not enough data")).toBeInTheDocument();
    expect(within(tile("Usual readiness")).getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("100")).toBeNull();
    expect(screen.queryByText(/\$/)).toBeNull();
    expect(screen.queryByText(/speaking|filler|time to ready/i)).toBeNull();
    expect(screen.queryByText("Relevant examples provided")).toBeNull();
    expect(screen.getByText("Complete your first interview.")).toBeInTheDocument();
  });

  it("shows real patterns with how often they came up", async () => {
    api.getOverview.mockResolvedValue({
      ...EMPTY_OVERVIEW,
      completed_sessions: 3,
      average_score: 70,
      readiness_distribution: { "Nearly Ready": 2, "Interview Ready": 1 },
    });
    api.getProgress.mockResolvedValue({
      ...EMPTY_PROGRESS,
      score_timeline: [point("2026-10-01", 60), point("2026-10-02", 70), point("2026-10-03", 80)],
      top_strengths: [{ item: "clear structure", count: 3 }],
      top_improvements: [{ item: "quantify outcomes", count: 2 }],
    });
    api.getSkills.mockResolvedValue({ ...EMPTY_SKILLS, skills_demonstrated: ["SQL"], skills_to_practice: ["Kubernetes"] });
    renderPage();
    await screen.findByText("Score consistency");
    expect(within(tile("Score consistency")).getByText("±8")).toBeInTheDocument();
    expect(within(tile("Usual readiness")).getByText("Nearly Ready")).toBeInTheDocument();
    const strengths = screen.getByRole("region", { name: "Recurring strengths" });
    expect(within(strengths).getByText("Clear structure")).toBeInTheDocument();
    expect(within(strengths).getByText("in 3 interviews")).toBeInTheDocument();
    const improve = screen.getByRole("region", { name: "Recurring improvements" });
    expect(within(improve).getByRole("link", { name: /practise these/i })).toHaveAttribute("href", "/interview/setup");
    const skills = screen.getByRole("region", { name: "Skills" });
    expect(within(skills).getByText("SQL")).toBeInTheDocument();
    expect(within(skills).getByText("Kubernetes")).toBeInTheDocument();
    expect(screen.getByText("Reach a 78+ average — the strong band.")).toBeInTheDocument();
  });

  it("says when loading failed instead of showing an empty account", async () => {
    api.getSkills.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your insights.");
    expect(screen.queryByText("Score consistency")).toBeNull();
  });
});
