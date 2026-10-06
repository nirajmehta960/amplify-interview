import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HERO } from "./content";
import { LandingHero } from "./hero";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
// framer-motion's scroll tracking is not what is under test here.
vi.mock("./hero-shot", () => ({ HeroShot: () => null }));

function renderHero() {
  return render(
    <MemoryRouter>
      <LandingHero />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
});

describe("LandingHero", () => {
  it("reads the headline as one sentence pair under a single h1", () => {
    renderHero();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Walk in prepared. Walk out hired.");
  });

  it("sends visitors to sign-up", () => {
    renderHero();
    expect(screen.getByRole("link", { name: HERO.primaryCta })).toHaveAttribute("href", "/auth/signup");
  });

  it("sends signed-in users straight to interview setup", () => {
    auth.user = { uid: "u1" };
    renderHero();
    expect(screen.getByRole("link", { name: HERO.primaryCtaSignedIn })).toHaveAttribute("href", "/interview/setup");
  });

  it("links the secondary action to the timeline in-page", () => {
    renderHero();
    expect(screen.getByRole("link", { name: HERO.secondaryCta.label })).toHaveAttribute("href", "#how-it-works");
  });

  it("keeps a dark fallback ground so the light copy is readable before the artwork loads", () => {
    const { container } = renderHero();
    const band = container.querySelector("section#top") as HTMLElement;
    expect(band.className).not.toMatch(/(^|\s)bg-white(\s|$)/);
    expect(band.className).toContain("bg-[linear-gradient(");
  });

  it("is the band the nav watches", () => {
    const { container } = renderHero();
    expect(container.querySelector("section#top")).toHaveAttribute("data-band", "ink");
  });
});
