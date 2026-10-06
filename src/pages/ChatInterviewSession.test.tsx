import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatInterviewSession from "./ChatInterviewSession";

const api = vi.hoisted(() => ({ createSession: vi.fn(), sendMessage: vi.fn(), endSession: vi.fn() }));
const getUserMedia = vi.hoisted(() => vi.fn());
vi.mock("@/services/apiClient", () => ({ interviewApi: api }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useVideoRecording", () => ({
  useVideoRecording: () => ({ startRecording: vi.fn(), stopRecording: vi.fn(), onAudioChunk: vi.fn(), recordingTime: 0 }),
}));
vi.mock("@/services/deepgramTranscriptionService", () => ({ default: { createStreamingSession: vi.fn() } }));

const START = {
  session_id: "s1",
  first_message: { message_id: "m1", role: "interviewer", content: "Tell me about a project you led." },
  progress: {
    questions_asked: 1,
    questions_total: 8,
    current_difficulty: "medium",
    topics_covered: ["leadership"],
    average_score: 0,
    is_complete: false,
    time_elapsed_seconds: 0,
  },
};

function renderSession() {
  sessionStorage.setItem("interviewConfig", JSON.stringify({ config: { mode: "behavioral", questionCount: 8 } }));
  return render(
    <MemoryRouter>
      <ChatInterviewSession />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  api.createSession.mockReset().mockResolvedValue(START);
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [] });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Element.prototype.scrollIntoView = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
});

describe("ChatInterviewSession", () => {
  it("does not ask for the camera when the interview starts", async () => {
    renderSession();
    await screen.findByText("Tell me about a project you led.");
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("turns on a video-only self-view when asked, and says it is not recorded", async () => {
    const user = userEvent.setup();
    renderSession();
    await screen.findByText("Tell me about a project you led.");
    await user.click(screen.getByRole("button", { name: "Show camera" }));
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
    expect(screen.getByText("Only you can see this — nothing is recorded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide camera" })).toBeInTheDocument();
  });

  it("shows which question you are on in the header", async () => {
    renderSession();
    expect(await screen.findByText("Question 1 of 8")).toBeInTheDocument();
  });

  it("opens session progress as a sheet for small screens", async () => {
    const user = userEvent.setup();
    renderSession();
    await screen.findByText("Tell me about a project you led.");
    await user.click(screen.getByRole("button", { name: "Show progress" }));
    const sheet = await screen.findByRole("dialog", { name: "Session progress" });
    expect(within(sheet).getByText("leadership")).toBeInTheDocument();
  });

  it("is a plain full-screen page with one h1", async () => {
    renderSession();
    await screen.findByText("Tell me about a project you led.");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
