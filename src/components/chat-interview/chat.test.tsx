import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ChatMessage, SessionProgress } from "@/services/apiClient";
import ChatBubble from "./ChatBubble";
import ProgressSidebar from "./ProgressSidebar";

const analysis = {
  score: 82,
  communication_scores: { clarity: 64, structure: 78, conciseness: 80 },
  content_scores: { relevance: 90, depth: 84, specificity: 86 },
  strengths: ["Concrete method"],
  improvements: ["Name the trade-off you rejected"],
  brief_feedback: "Strong, specific answer. Name the trade-off.",
};

describe("ChatBubble", () => {
  it("labels the interviewer's question with difficulty, category and follow-up", () => {
    const msg: ChatMessage = {
      role: "interviewer",
      content: "Tell me about a time…",
      question_metadata: { difficulty: "hard", category: "behavioral", is_followup: true, question_number: 3 },
    } as ChatMessage;
    render(<ChatBubble message={msg} />);
    expect(screen.getByText("Tell me about a time…")).toBeInTheDocument();
    expect(screen.getByText(/hard/i)).toBeInTheDocument();
    expect(screen.getByText("behavioral")).toBeInTheDocument();
    expect(screen.getByText(/follow-up/i)).toBeInTheDocument();
    expect(screen.getByText("Q3")).toBeInTheDocument();
  });

  it("scores the candidate's answer on the shared scale and opens the breakdown", async () => {
    const user = userEvent.setup();
    render(<ChatBubble message={{ role: "candidate", content: "My answer", analysis }} />);
    expect(screen.getByText("82/100")).toHaveAttribute("data-score-band", "high");
    const toggle = screen.getByRole("button", { name: /82\/100/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Concrete method")).toBeInTheDocument();
    expect(screen.getByText("Name the trade-off you rejected")).toBeInTheDocument();
    expect(screen.getByText("clarity").closest("[data-score-band]")).toHaveAttribute("data-score-band", "mid");
  });

  it("still shows the message time from the `timestamp` field (cross-layer contract)", () => {
    render(<ChatBubble message={{ role: "interviewer", content: "Hi", timestamp: "2026-10-06T09:05:00Z" }} />);
    expect(screen.getByRole("time")).toHaveAttribute("dateTime", "2026-10-06T09:05:00Z");
  });
});

describe("ProgressSidebar", () => {
  const progress: SessionProgress = {
    questions_asked: 2,
    questions_total: 8,
    current_difficulty: "hard",
    topics_covered: ["prioritisation"],
    average_score: 82,
    is_complete: false,
    time_elapsed_seconds: 480,
  };

  it("shows progress, the average on the shared scale, difficulty and topics", () => {
    render(<ProgressSidebar progress={progress} lastAnalysis={null} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/ 8")).toBeInTheDocument();
    expect(screen.getByText("82")).toHaveAttribute("data-score-band", "high");
    expect(screen.getByText(/hard/i)).toBeInTheDocument();
    expect(screen.getByText("prioritisation")).toBeInTheDocument();
  });

  it("shows a dash before any answer is scored", () => {
    render(<ProgressSidebar progress={{ ...progress, average_score: 0 }} lastAnalysis={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows the latest feedback and its first tip", () => {
    render(<ProgressSidebar progress={progress} lastAnalysis={analysis} />);
    expect(screen.getByText(analysis.brief_feedback)).toBeInTheDocument();
    expect(screen.getByText(/Name the trade-off you rejected/)).toBeInTheDocument();
  });
});
