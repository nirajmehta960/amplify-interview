import { act, render, screen, waitFor } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MockIntersectionObserver,
  installIntersectionObserver,
  mockMatchMedia,
} from "@/test/browser-mocks";
import { ENTER_CAP_MS, useLandingMotion } from "./motion";
import { Reveal } from "./reveal";

function Harness() {
  const ref = useRef<HTMLDivElement>(null);
  const motionClass = useLandingMotion(ref, "/images/landing/hero-ground.webp");
  return (
    <div ref={ref} data-testid="root" className={motionClass}>
      <Reveal>Revealed copy</Reveal>
    </div>
  );
}

const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");

afterEach(() => {
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, "decode", originalDecode);
  else delete (HTMLImageElement.prototype as { decode?: unknown }).decode;
});

describe("useLandingMotion", () => {
  it("hides nothing under reduced motion", () => {
    mockMatchMedia({ reduced: true });
    installIntersectionObserver();
    render(<Harness />);
    expect(screen.getByTestId("root").className).toBe("");
  });

  it("fails open: without IntersectionObserver the scroll reveals are never armed", () => {
    mockMatchMedia();
    render(<Harness />);
    const root = screen.getByTestId("root");
    expect(root).not.toHaveClass("landing-js");
    expect(root).toHaveClass("landing-enter");
  });

  it("arms reveals and releases the entrance once the hero is ready", async () => {
    mockMatchMedia();
    installIntersectionObserver();
    render(<Harness />);
    const root = screen.getByTestId("root");
    expect(root).toHaveClass("landing-js", "landing-enter");
    await waitFor(() => expect(root).toHaveClass("landing-entered"));
  });

  it("releases the entrance after the cap even if the ground image never decodes", async () => {
    vi.useFakeTimers();
    Object.defineProperty(HTMLImageElement.prototype, "decode", {
      configurable: true,
      value: () => new Promise<void>(() => {}),
    });
    mockMatchMedia();
    installIntersectionObserver();
    render(<Harness />);
    const root = screen.getByTestId("root");
    expect(root).not.toHaveClass("landing-entered");
    await act(async () => {
      vi.advanceTimersByTime(ENTER_CAP_MS);
    });
    expect(root).toHaveClass("landing-entered");
  });

  it("marks a reveal target when it scrolls into view", () => {
    mockMatchMedia();
    installIntersectionObserver();
    render(<Harness />);
    const target = screen.getByText("Revealed copy").closest("[data-reveal]");
    expect(target).not.toHaveAttribute("data-revealed");
    act(() => MockIntersectionObserver.fire(target as Element, true));
    expect(target).toHaveAttribute("data-revealed");
  });
});
