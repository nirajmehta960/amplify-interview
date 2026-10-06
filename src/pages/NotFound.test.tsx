import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotFound from "./NotFound";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function renderAt(path: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <NotFound />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

beforeEach(() => {
  auth.user = null;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NotFound", () => {
  it("says the page is missing, names the address, and links home", () => {
    renderAt("/dashboard/analytics");
    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that page" })).toBeInTheDocument();
    expect(screen.getByText("/dashboard/analytics")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Go to dashboard" })).toBeNull();
  });

  it("offers the dashboard to a signed-in user", () => {
    auth.user = { uid: "u1" };
    renderAt("/nowhere");
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
  });

  it("uses the design tokens, not the stock grey page", () => {
    const { container } = renderAt("/nowhere");
    expect(container.innerHTML).not.toMatch(/gray-|blue-500/);
  });
});
