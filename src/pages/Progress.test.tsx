import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Progress from "./Progress";

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
};
const EMPTY_PROGRESS = { score_timeline: [], communication_timeline: [], top_strengths: [], top_improvements: [] };

const FULL_OVERVIEW = { ...EMPTY_OVERVIEW, completed_sessions: 3, average_score: 71.7, recent_scores: [80, 64, 71] };
const FULL_PROGRESS = {
  ...EMPTY_PROGRESS,
  score_timeline: [
    { date: "2026-10-01", score: 64, mode: "behavioral", readiness: "Nearly Ready" },
    { date: "2026-10-02", score: 71, mode: "technical", readiness: "Nearly Ready" },
    { date: "2026-10-03", score: 80, mode: "behavioral", readiness: "Interview Ready" },
  ],
  communication_timeline: [
    { date: "2026-10-01", clarity: 60, structure: 62, conciseness: 70 },
    { date: "2026-10-03", clarity: 78, structure: 74, conciseness: 81 },
  ],
};

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Progress />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const tile = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

beforeEach(() => {
  api.getOverview.mockReset().mockResolvedValue(EMPTY_OVERVIEW);
  api.getProgress.mockReset().mockResolvedValue(EMPTY_PROGRESS);
});

describe("Progress", () => {
  it("has its h1 while loading", () => {
    api.getOverview.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Progress" })).toBeInTheDocument();
  });

  it("shows a new account dashes and empty states, not zeros", async () => {
    renderPage();
    await screen.findByText("Average score");
    expect(within(tile("Average score")).getByText("—")).toBeInTheDocument();
    expect(within(tile("Best score")).getByText("—")).toBeInTheDocument();
    expect(within(tile("Trend")).getByText("Not enough data")).toBeInTheDocument();
    expect(screen.getByText("Your scores chart here after two scored interviews.")).toBeInTheDocument();
    expect(screen.getByText("0 of 6")).toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).toBeNull();
    expect(screen.queryByText(/points/i)).toBeNull();
  });

  it("reports real averages, best score and scores by type", async () => {
    api.getOverview.mockResolvedValue(FULL_OVERVIEW);
    api.getProgress.mockResolvedValue(FULL_PROGRESS);
    renderPage();
    await screen.findByText("Average score");
    expect(within(tile("Average score")).getByText("72")).toHaveAttribute("data-score-band", "mid");
    expect(within(tile("Best score")).getByText("80")).toHaveAttribute("data-score-band", "high");
    expect(within(tile("Interviews scored")).getByText("3")).toBeInTheDocument();
    const byType = screen.getByRole("region", { name: "By interview type" });
    expect(within(byType).getByText("Behavioral")).toBeInTheDocument();
    expect(within(byType).getByText("2 interviews")).toBeInTheDocument();
    expect(screen.getByText("Scores, oldest to newest: 64, 71, 80.")).toBeInTheDocument();
  });

  it("says when loading failed instead of showing an empty account", async () => {
    api.getOverview.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your progress.");
    expect(screen.queryByText("Average score")).toBeNull();
  });
});
