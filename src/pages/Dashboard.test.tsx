import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Dashboard from "./Dashboard";

const data = vi.hoisted(() => ({
  value: {
    loading: false,
    profile: { uid: "u1", display_name: "Ada" },
    sessions: [
      { session_id: "a", status: "completed", mode: "behavioral", created_at: "2026-10-03T10:00:00Z", question_count: 8, overall_score: 82 },
    ],
    overview: { total_sessions: 1, completed_sessions: 1, average_score: 82, performance_trend: "consistent", recent_scores: [82] },
    progress: { score_timeline: [], top_improvements: [{ item: "Quantify impact", count: 2 }] },
    sessionsError: false,
    analyticsError: false,
    refresh: vi.fn(),
  },
}));
vi.mock("@/components/dashboard/useDashboardData", () => ({ useDashboardData: () => data.value }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1", email: "ada@example.com" } }) }));

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("Dashboard", () => {
  it("has one page heading and a New interview action", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^new interview$/i })).toHaveAttribute("href", "/interview/setup");
  });

  it("composes the sections from real data", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Welcome back, Ada" })).toBeInTheDocument();
    expect(screen.getByText("Your last interview scored 82 · Strong answer")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent scores" })).toBeInTheDocument();
    expect(screen.getByText("Quantify impact")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent interviews" })).toBeInTheDocument();
  });

  it("draws no page chrome of its own (the shell owns it)", () => {
    renderPage();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/sign out/i)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\+\d+%/);
  });

  it("never shows a failed load as a brand-new empty account", () => {
    const original = data.value;
    data.value = { ...original, sessions: [], overview: null, progress: null, sessionsError: true, analyticsError: true };
    try {
      renderPage();
      expect(screen.queryByText(/three steps/i)).toBeNull();
      expect(screen.queryByText("No interviews yet")).toBeNull();
      expect(screen.queryByText("0 days")).toBeNull();
      expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(3);
    } finally {
      data.value = original;
    }
  });
});
