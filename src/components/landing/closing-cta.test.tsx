import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClosingCta } from "./closing-cta";
import { CLOSING } from "./content";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function renderClosing() {
  return render(
    <MemoryRouter>
      <ClosingCta />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
});

describe("ClosingCta", () => {
  it("sends visitors to sign-up and members to setup", () => {
    const { unmount } = renderClosing();
    expect(screen.getByRole("link", { name: CLOSING.cta })).toHaveAttribute("href", "/auth/signup");
    unmount();
    auth.user = { uid: "u1" };
    renderClosing();
    expect(screen.getByRole("link", { name: CLOSING.ctaSignedIn })).toHaveAttribute("href", "/interview/setup");
  });

  it("marks the gradient as idle-animated so it only runs near the viewport", () => {
    const { container } = renderClosing();
    expect(container.querySelector(".landing-fluid")).toHaveAttribute("data-animate-idle");
  });
});
