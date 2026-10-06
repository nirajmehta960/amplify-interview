import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { NAV_LINKS, SECTION_IDS } from "@/components/landing/content";
import Index from "./Index";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/landing/hero-shot", () => ({ HeroShot: () => null }));

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("Landing page", () => {
  it("has exactly one h1 and the three landmarks", () => {
    renderPage();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("offers a skip link to the main content", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main");
  });

  it("renders every band, and every nav link points at one", () => {
    renderPage();
    for (const id of Object.values(SECTION_IDS)) {
      expect(document.getElementById(id), `#${id}`).not.toBeNull();
    }
    for (const link of NAV_LINKS) {
      expect(document.querySelector(link.href), link.href).not.toBeNull();
    }
  });

  it("scopes the page for landing.css", () => {
    const { container } = renderPage();
    expect(container.querySelector("[data-landing] > [data-band='paper']")).not.toBeNull();
  });
});
