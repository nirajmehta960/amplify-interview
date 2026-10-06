import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LandingCta } from "./cta";

function renderAt(element: ReactNode) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={element} />
        <Route path="/auth/signup" element={<p>Signup page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LandingCta", () => {
  it("keeps in-page targets as plain anchors so the router does not reset scroll", () => {
    renderAt(<LandingCta to="#faq">FAQ</LandingCta>);
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#faq");
  });

  it("routes app destinations through the router", async () => {
    const user = userEvent.setup();
    renderAt(<LandingCta to="/auth/signup">Start</LandingCta>);
    await user.click(screen.getByRole("link", { name: "Start" }));
    expect(screen.getByText("Signup page")).toBeInTheDocument();
  });

  it("uses the band accent for the primary variant and the band ink for the ink variant", () => {
    renderAt(
      <>
        <LandingCta to="#a">Primary</LandingCta>
        <LandingCta to="#b" variant="ink">
          Ink
        </LandingCta>
      </>,
    );
    expect(screen.getByRole("link", { name: "Primary" })).toHaveClass("landing-cta-primary", "bg-band-accent");
    expect(screen.getByRole("link", { name: "Ink" })).toHaveClass("landing-cta-ink", "bg-band-fg");
  });
});
