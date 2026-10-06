import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PracticeQuestions from "./PracticeQuestions";

const bank = vi.hoisted(() => ({
  getUserQuestions: vi.fn(),
  getQuestionBankStats: vi.fn(),
  addQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
}));
vi.mock("@/services/userQuestionBankService", () => ({ userQuestionBankService: bank }));
const auth = vi.hoisted(() => ({ user: { uid: "u1" } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const QUESTIONS = [
  { id: "q1", text: "Tell me about a conflict you resolved.", category: "Behavioral", created_at: "2026-10-01T10:00:00Z", user_id: "u1" },
  { id: "q2", text: "Design a rate limiter.", category: "Technical", created_at: "2026-10-02T10:00:00Z", user_id: "u1" },
];

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PracticeQuestions />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const tile = (label: string) => screen.getByText(label).closest("li") as HTMLElement;

beforeEach(() => {
  Object.values(bank).forEach((fn) => fn.mockReset());
  bank.getUserQuestions.mockResolvedValue(QUESTIONS);
});

describe("PracticeQuestions", () => {
  it("has its h1 while loading", () => {
    bank.getUserQuestions.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Practice questions" })).toBeInTheDocument();
  });

  it("greets an empty bank as empty, not as a failed search", async () => {
    bank.getUserQuestions.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("No questions yet")).toBeInTheDocument();
    expect(screen.queryByText(/matching your search/i)).toBeNull();
    expect(screen.getByRole("button", { name: /add your first question/i })).toBeInTheDocument();
  });

  it("counts what is in the bank and drops the meaningless tiles", async () => {
    renderPage();
    await screen.findByText("Design a rate limiter.");
    expect(within(tile("Questions")).getByText("2")).toBeInTheDocument();
    expect(within(tile("Categories")).getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("Filtered")).toBeNull();
    expect(screen.queryByText("Pages")).toBeNull();
    expect(screen.getByText(/interviews are generated from your résumé/i)).toBeInTheDocument();
  });

  it("explains an empty search and clears it", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Design a rate limiter.");
    await user.type(screen.getByRole("searchbox", { name: "Search questions" }), "kubernetes");
    expect(screen.getByText("No questions match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("Design a rate limiter.")).toBeInTheDocument();
  });

  it("names every icon button", async () => {
    renderPage();
    await screen.findByText("Design a rate limiter.");
    expect(screen.getAllByRole("button", { name: "Edit question" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Delete question" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute("aria-pressed", "false");
  });

  it("says when loading failed instead of showing an empty bank", async () => {
    bank.getUserQuestions.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your questions.");
    expect(screen.queryByText("No questions yet")).toBeNull();
  });
});
