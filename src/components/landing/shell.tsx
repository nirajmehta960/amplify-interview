import { useRef, type ReactNode } from "react";
import { HERO } from "./content";
import { LandingFooter } from "./footer";
import { useLandingMotion } from "./motion";
import { LandingNav } from "./nav";

import "./landing.css";

/**
 * The landing root. Two elements, and it has to be two: landing.css declares
 * bands as `[data-landing] [data-band]` (a DESCENDANT selector), so one element
 * carrying both attributes would match nothing and every band colour would be
 * undefined.
 */
export function LandingShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const motionClass = useLandingMotion(root, HERO.groundSrc);

  return (
    <div ref={root} data-landing="" className={motionClass || undefined}>
      {/* White, so fractional-pixel seams between bands blend invisibly. */}
      <div data-band="paper" className="flex min-h-screen flex-col bg-white font-landing text-band-fg antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-band-accent focus:px-5 focus:py-3 focus:text-band-on-accent"
        >
          Skip to content
        </a>
        <LandingNav />
        <main id="main" className="flex-1">
          {children}
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
