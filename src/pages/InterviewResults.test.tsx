import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InterviewResults from "./InterviewResults";

const api = vi.hoisted(() => ({ get: vi.fn(), generate: vi.fn(), getMessages: vi.fn() }));
vi.mock("@/services/apiClient", () => ({
  feedbackApi: { get: api.get, generate: api.generate },
  interviewApi: { getMessages: api.getMessages },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const FEEDBACK = {
  session_id: "abc-123",
  overall_score: 82,
  communication_scores: { clarity: 64, structure: 78, conciseness: 80 },
  content_scores: { relevance: 90, depth: 84, specificity: 40 },
  strengths: ["Clear prioritisation"],
  improvements: ["Quantify the outcome"],
  actionable_feedback: "Strong answers overall; quantify outcomes.",
  readiness_level: "Interview Ready",
  readiness_score: 82,
  next_steps: [],
  performance_trend: "consistent",
  skill_gaps_addressed: [],
  skill_gaps_remaining: [],
  total_questions: 2,
  questions_answered: 1,
  total_cost_cents: 3,
};

const MESSAGES = [
  { message_id: "q1", role: "interviewer", content: "Tell me about a project.", question_metadata: { is_followup: false } },
  {
    message_id: "a1",
    role: "candidate",
    content: "I led a migration.",
    analysis: { score: 82, strengths: ["Specific"], improvements: ["Shorter"], brief_feedback: "", communication_scores: {}, content_scores: {} },
  },
  { message_id: "q2", role: "interviewer", content: "What would you do differently?" },
];

function renderResults() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/results/abc-123"]}>
        <Routes>
          <Route path="/results/:sessionId" element={<InterviewResults />} />
          <Route path="/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  api.get.mockReset().mockResolvedValue(FEEDBACK);
  api.generate.mockReset();
  api.getMessages.mockReset().mockResolvedValue({ messages: MESSAGES });
});

describe("InterviewResults", () => {
  it("shows the overall score on the shared scale with the shared verdict", async () => {
    renderResults();
    expect(await screen.findByText("82/100")).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText("Strong answer")).toBeInTheDocument();
    expect(screen.getByText("Interview Ready")).toBeInTheDocument();
  });

  it("colours each rubric dimension by its own score", async () => {
    renderResults();
    await screen.findByText("82/100");
    expect(screen.getByText("Specificity").closest("[data-score-band]")).toHaveAttribute("data-score-band", "low");
    expect(screen.getByText("Relevance").closest("[data-score-band]")).toHaveAttribute("data-score-band", "high");
  });

  it("reviews each question, marking unanswered ones, and expands an answer", async () => {
    const user = userEvent.setup();
    renderResults();
    await screen.findByText("82/100");
    expect(screen.getByText("Unanswered")).toBeInTheDocument();
    const q1 = screen.getByRole("button", { name: /Tell me about a project/ });
    expect(q1).toHaveAttribute("aria-expanded", "false");
    await user.click(q1);
    expect(q1).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("I led a migration.")).toBeInTheDocument();
  });

  it("offers a way back to the dashboard when there are no results", async () => {
    api.get.mockRejectedValue({ status: 500 });
    renderResults();
    const back = await screen.findByRole("link", { name: /back to dashboard/i });
    expect(back).toHaveAttribute("href", "/dashboard");
  });
});
