import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockIntersectionObserver, installIntersectionObserver } from "@/test/browser-mocks";
import { LandingNav } from "./nav";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));

function renderNav() {
  return render(
    <MemoryRouter>
      <div data-landing="">
        <section id="top" data-testid="hero" />
        <LandingNav />
      </div>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
  installIntersectionObserver();
});

describe("LandingNav", () => {
  it("uses the dark tone over the hero and the cream tone after it", () => {
    renderNav();
    const header = screen.getByRole("banner");
    const hero = screen.getByTestId("hero");
    expect(header).toHaveAttribute("data-band", "ink");
    act(() => MockIntersectionObserver.fire(hero, false));
    expect(header).toHaveAttribute("data-band", "cream");
    act(() => MockIntersectionObserver.fire(hero, true));
    expect(header).toHaveAttribute("data-band", "ink");
  });

  it("flips at the product shot, not the hero's foot, because the hero's lower half is light", () => {
    render(
      <MemoryRouter>
        <div data-landing="">
          <section id="top">
            <div data-nav-sentinel="" data-testid="sentinel" />
          </section>
          <LandingNav />
        </div>
      </MemoryRouter>,
    );
    const header = screen.getByRole("banner");
    const sentinel = screen.getByTestId("sentinel");
    // Shot still below the fold on a short screen: the dark top is under the nav.
    act(() => MockIntersectionObserver.fire(sentinel, false, { top: 1200 }));
    expect(header).toHaveAttribute("data-band", "ink");
    // Shot's top has scrolled up past the nav: light content is under it now.
    act(() => MockIntersectionObserver.fire(sentinel, false, { top: -40 }));
    expect(header).toHaveAttribute("data-band", "cream");
    act(() => MockIntersectionObserver.fire(sentinel, true, { top: 300 }));
    expect(header).toHaveAttribute("data-band", "ink");
  });

  it("offers sign-in and sign-up to visitors", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/signin");
    expect(screen.getByRole("link", { name: "Start free" })).toHaveAttribute("href", "/auth/signup");
  });

  it("offers the dashboard to signed-in users instead", () => {
    auth.user = { uid: "u1" };
    renderNav();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it("keeps the mobile menu inside the landing colour scope", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    const faq = within(dialog).getByRole("link", { name: "FAQ" });
    expect(faq.closest("[data-landing]")).not.toBeNull();
    expect(faq.closest("[data-band]")).toHaveAttribute("data-band", "cream");
  });
});
