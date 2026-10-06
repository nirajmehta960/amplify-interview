import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate, type NavigateFunction } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "@/test/browser-mocks";
import { AppShell } from "./AppShell";

const auth = vi.hoisted(() => ({
  user: { uid: "u1", email: "ada@example.com", displayName: "Ada Lovelace" } as null | {
    uid: string;
    email?: string;
    displayName?: string;
  },
  signOut: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
const getProfile = vi.hoisted(() => vi.fn());
vi.mock("@/services/apiClient", () => ({ userApi: { getProfile } }));

let navigateTo: NavigateFunction;
function CaptureNavigate() {
  navigateTo = useNavigate();
  return null;
}

function renderShell(path: string | string[] = "/dashboard") {
  const entries = Array.isArray(path) ? path : [path];
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <CaptureNavigate />
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
          <Route path="/dashboard/progress" element={<p>Progress content</p>} />
          <Route path="/dashboard/notes" element={<input aria-label="Notes" />} />
        </Route>
        <Route path="/" element={<p>Landing page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.signOut.mockReset();
  auth.signOut.mockResolvedValue(undefined);
  mockMatchMedia();
  window.innerWidth = 1280;
  getProfile.mockReset().mockRejectedValue(new Error("no profile"));
});

const railState = () => screen.getByRole("navigation", { name: "Main" }).closest("[data-state]");

describe("AppShell", () => {
  it("renders the rail navigation around the page", () => {
    renderShell();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    for (const name of ["Dashboard", "New interview", "Practice questions", "Progress", "Insights"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("exposes the rail as the main navigation landmark", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Progress" })).toBeInTheDocument();
  });

  it("names the mobile navigation sheet", async () => {
    window.innerWidth = 375;
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(await screen.findByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
  });

  it("marks the current page", () => {
    renderShell("/dashboard/progress");
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("shows who is signed in", () => {
    renderShell();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("signs out and returns to the landing page", async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("Landing page")).toBeInTheDocument());
  });

  it("still leaves when sign-out fails", async () => {
    auth.signOut.mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByText("Landing page")).toBeInTheDocument());
  });

  it("has no dead controls: no search box, bell, help or settings", () => {
    renderShell();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/help & support/i)).toBeNull();
    expect(screen.queryByText(/^settings$/i)).toBeNull();
    expect(document.querySelector('a[href="#"]')).toBeNull();
  });

  it("closes the mobile sheet when a link is chosen", async () => {
    window.innerWidth = 375;
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("link", { name: "Progress" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Progress content")).toBeInTheDocument();
  });

  it("names the user from their profile, as the dashboard does", async () => {
    getProfile.mockResolvedValue({ uid: "u1", display_name: "Countess Ada" });
    renderShell();
    expect(await screen.findByText("Countess Ada")).toBeInTheDocument();
  });

  it("toggles the rail with Cmd/Ctrl+B, but not while typing in a field", async () => {
    const user = userEvent.setup();
    renderShell("/dashboard/notes");
    await user.click(screen.getByRole("textbox", { name: "Notes" }));
    await user.keyboard("{Meta>}b{/Meta}");
    expect(railState()).toHaveAttribute("data-state", "expanded");
    (document.activeElement as HTMLElement).blur();
    await user.keyboard("{Meta>}b{/Meta}");
    expect(railState()).toHaveAttribute("data-state", "collapsed");
  });

  it("closes the mobile sheet when the browser goes back", async () => {
    window.innerWidth = 375;
    const user = userEvent.setup();
    renderShell(["/dashboard", "/dashboard/progress"]);
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await screen.findByRole("dialog", { name: "Navigation" });
    act(() => navigateTo(-1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("leaves the rail and the phone bar out of print", () => {
    renderShell();
    expect(railState()).toHaveClass("print:hidden");
    expect(screen.getByRole("button", { name: "Open navigation" }).parentElement).toHaveClass("print:hidden");
  });
});
