import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { SessionListItem } from "@/services/apiClient";
import { FocusNext } from "./FocusNext";
import { RecentInterviews } from "./RecentInterviews";
import { ScoreTrend } from "./ScoreTrend";
import { StatTiles } from "./StatTiles";
import { WelcomeCard } from "./WelcomeCard";

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);
const overview = {
  total_sessions: 6,
  completed_sessions: 6,
  average_score: 81.6,
  performance_trend: "improving",
  recent_scores: [70, 82, 77, 85, 90, 86],
};

describe("StatTiles", () => {
  it("shows real numbers, a worded trend and the average coloured by the score scale", () => {
    wrap(<StatTiles loading={false} overview={overview} streak={3} />);
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("82")).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("Improving")).toBeInTheDocument();
    expect(screen.getByText("3 days")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/%/);
  });

  it("shows dashes and not-enough-data for a new user", () => {
    wrap(
      <StatTiles
        loading={false}
        overview={{ ...overview, completed_sessions: 0, average_score: 0, performance_trend: "consistent", recent_scores: [] }}
        streak={0}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Not enough data")).toBeInTheDocument();
    expect(screen.getByText("0 days")).toBeInTheDocument();
    // No arrow for a trend that has not been measured.
    const trendTile = screen.getByText("Not enough data").closest("li") as HTMLElement;
    expect(trendTile.querySelector("svg")).toHaveClass("lucide-circle-dashed");
  });

  it("shows a dash, not a red 0, when interviews are completed but none is scored yet", () => {
    wrap(<StatTiles loading={false} overview={{ ...overview, completed_sessions: 1, average_score: 0, recent_scores: [] }} streak={1} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("says the numbers failed to load instead of showing zeros", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    wrap(<StatTiles loading={false} overview={null} streak={0} error onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your stats/i);
    expect(screen.queryByText("0 days")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows skeletons, never zeros, while loading", () => {
    wrap(<StatTiles loading overview={null} streak={0} />);
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
  });
});

describe("WelcomeCard", () => {
  it("greets returning users with their status line", () => {
    wrap(<WelcomeCard loading={false} name="Ada" status="Your last interview scored 82 · Strong answer" hasSessions />);
    expect(screen.getByRole("heading", { name: "Welcome back, Ada" })).toBeInTheDocument();
    expect(screen.getByText("Your last interview scored 82 · Strong answer")).toBeInTheDocument();
  });

  it("guides new users through getting started", () => {
    wrap(<WelcomeCard loading={false} name="Ada" status="" hasSessions={false} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /start your first interview/i })).toHaveAttribute("href", "/interview/setup");
  });
});

describe("WelcomeCard errors", () => {
  it("does not show first-time onboarding when the interviews failed to load", () => {
    wrap(<WelcomeCard loading={false} name="Ada" status="" hasSessions={false} error onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your interviews/i);
    expect(screen.queryByText(/three steps/i)).toBeNull();
  });
});

describe("ScoreTrend", () => {
  it("labels the bands by score, not as a promise about the next interview", () => {
    wrap(<ScoreTrend loading={false} timeline={[]} />);
    expect(screen.getByText("Each point is one interview's overall score.")).toBeInTheDocument();
  });

  it("says when the scores failed to load", () => {
    wrap(<ScoreTrend loading={false} timeline={undefined} error />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your scores/i);
  });

  it("asks for two interviews before drawing a trend", () => {
    wrap(<ScoreTrend loading={false} timeline={[{ date: "2026-10-01", score: 70, mode: "m", readiness: "r" }]} />);
    expect(screen.getByText("Complete two interviews to see your trend.")).toBeInTheDocument();
  });

  it("lists the scores for screen readers, oldest to newest", () => {
    wrap(
      <ScoreTrend
        loading={false}
        timeline={[
          { date: "2026-10-03", score: 82, mode: "m", readiness: "r" },
          { date: "2026-10-01", score: 70.4, mode: "m", readiness: "r" },
        ]}
      />,
    );
    expect(screen.getByText("Scores, oldest to newest: 70, 82.")).toBeInTheDocument();
  });
});

describe("FocusNext", () => {
  it("says when the themes failed to load", () => {
    wrap(<FocusNext loading={false} improvements={undefined} error />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load/i);
  });

  it("lists up to three improvement themes and links to practice", () => {
    wrap(
      <FocusNext
        loading={false}
        improvements={["Quantify impact", "Use STAR", "Be concise", "Fourth"].map((item) => ({ item, count: 2 }))}
      />,
    );
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("link", { name: /practise these/i })).toHaveAttribute("href", "/interview/setup");
  });

  it("explains when there is nothing yet", () => {
    wrap(<FocusNext loading={false} improvements={[]} />);
    expect(screen.getByText("Your improvement themes appear after your first completed interview.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /practise these/i })).toBeNull();
  });
});

describe("RecentInterviews", () => {
  const sessions: SessionListItem[] = [
    { session_id: "a", status: "completed", mode: "behavioral", created_at: "2026-10-03T10:00:00Z", question_count: 8, overall_score: 82 },
    { session_id: "b", status: "in_progress", mode: "technical", created_at: "not-a-date", question_count: 5 },
  ];

  it("links every row to its results with a score pill on the shared scale", () => {
    wrap(<RecentInterviews loading={false} sessions={sessions} onRefresh={vi.fn()} />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/results/a", "/results/b"]);
    expect(screen.getByText("82")).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("survives a malformed date", () => {
    wrap(<RecentInterviews loading={false} sessions={sessions} onRefresh={vi.fn()} />);
    expect(screen.getByText(/technical interview/i)).toBeInTheDocument();
  });

  it("refreshes on demand", async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    wrap(<RecentInterviews loading={false} sessions={sessions} onRefresh={onRefresh} />);
    await user.click(screen.getByRole("button", { name: "Refresh interviews" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows an error, not an empty account, when loading failed", async () => {
    const onRefresh = vi.fn();
    const user = userEvent.setup();
    wrap(<RecentInterviews loading={false} sessions={[]} onRefresh={onRefresh} error />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your interviews/i);
    expect(screen.queryByText("No interviews yet")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("offers a first interview when empty", () => {
    wrap(<RecentInterviews loading={false} sessions={[]} onRefresh={vi.fn()} />);
    expect(screen.getByText("No interviews yet")).toBeInTheDocument();
  });
});
