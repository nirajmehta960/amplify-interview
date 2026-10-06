import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "@/test/browser-mocks";
import AppRoutes from "./AppRoutes";

const auth = vi.hoisted(() => ({
  user: { uid: "u1", email: "ada@example.com" } as null | { uid: string; email: string },
  loading: false,
  signOut: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

vi.mock("@/pages/Index", async () => (await import("@/test/fake-page")).fakePage("Index"));
vi.mock("@/pages/SignIn", async () => (await import("@/test/fake-page")).fakePage("SignIn"));
vi.mock("@/pages/SignUp", async () => (await import("@/test/fake-page")).fakePage("SignUp"));
vi.mock("@/pages/ForgotPassword", async () => (await import("@/test/fake-page")).fakePage("ForgotPassword"));
vi.mock("@/pages/ResetPassword", async () => (await import("@/test/fake-page")).fakePage("ResetPassword"));
vi.mock("@/pages/Dashboard", async () => (await import("@/test/fake-page")).fakePage("Dashboard"));
vi.mock("@/pages/Progress", async () => (await import("@/test/fake-page")).fakePage("Progress"));
vi.mock("@/pages/Insights", async () => (await import("@/test/fake-page")).fakePage("Insights"));
vi.mock("@/pages/PracticeQuestions", async () => (await import("@/test/fake-page")).fakePage("PracticeQuestions"));
vi.mock("@/pages/InterviewSetup", async () => (await import("@/test/fake-page")).fakePage("InterviewSetup"));
vi.mock("@/pages/ChatInterviewSession", async () => (await import("@/test/fake-page")).fakePage("ChatInterviewSession"));
vi.mock("@/pages/InterviewResults", async () => (await import("@/test/fake-page")).fakePage("InterviewResults"));
vi.mock("@/pages/NotFound", async () => (await import("@/test/fake-page")).fakePage("NotFound"));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1", email: "ada@example.com" };
  mockMatchMedia();
  window.innerWidth = 1280;
});

describe("AppRoutes", () => {
  it.each([
    ["/dashboard", "Dashboard"],
    ["/interview/setup", "InterviewSetup"],
    ["/dashboard/practice-questions", "PracticeQuestions"],
    ["/dashboard/progress", "Progress"],
    ["/dashboard/insights", "Insights"],
    ["/results/abc", "InterviewResults"],
  ])("renders %s inside the shell", (path, name) => {
    renderAt(path);
    expect(screen.getByText(`${name} page`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practice questions" })).toBeInTheDocument();
  });

  it.each(["/dashboard/analytics", "/dashboard/analytics/modern", "/demo/analytics", "/processing", "/review/abc"])(
    "no longer serves the mocked page at %s",
    (path) => {
      renderAt(path);
      expect(screen.getByText("NotFound page")).toBeInTheDocument();
    },
  );

  it("keeps the live interview in focus mode, without the rail", () => {
    renderAt("/interview/session");
    expect(screen.getByText("ChatInterviewSession page")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Practice questions" })).toBeNull();
  });

  it("still protects the live interview", () => {
    auth.user = null;
    renderAt("/interview/session");
    expect(screen.getByText("SignIn page")).toBeInTheDocument();
  });

  it("still protects shelled pages", () => {
    auth.user = null;
    renderAt("/dashboard");
    expect(screen.getByText("SignIn page")).toBeInTheDocument();
  });

  it("leaves public pages outside the shell", () => {
    renderAt("/");
    expect(screen.getByText("Index page")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Practice questions" })).toBeNull();
  });
});
