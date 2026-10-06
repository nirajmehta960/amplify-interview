import { Check } from "lucide-react";
import { SAMPLE } from "@/components/landing/content";
import { CriterionBar, ScoreRing } from "@/components/landing/score-visuals";
import { AUTH_PANEL } from "./content";

import "@/components/landing/landing.css";

/**
 * The desktop-only right half of every auth page: the landing's dark blue
 * field, one line of pitch, the example score card and three true features.
 *
 * It opens its own `[data-landing]` scope (landing.css bands are descendant
 * selectors) and reuses the closing panel's fluid gradient. Nothing here runs
 * the landing's motion observer, so the blobs stay paused: a still gradient.
 */
export function AuthPanel() {
  return (
    <aside aria-label="About Amplify Interview" data-landing="" className="relative hidden flex-1 lg:flex">
      <div
        data-band="ink"
        className="relative isolate flex w-full flex-col justify-center overflow-hidden bg-[#0B1733] px-12 py-16 text-band-fg xl:px-20"
      >
        <div aria-hidden="true" className="landing-fluid">
          <span className="landing-fluid-b" />
          <span className="landing-fluid-a" />
          <span className="landing-fluid-c" />
        </div>
        <div aria-hidden="true" className="landing-fluid-core" />
        <div aria-hidden="true" className="landing-grain" />

        <div className="relative max-w-md">
          <p className="label text-band-signal">{AUTH_PANEL.eyebrow}</p>
          <h2 className="mt-4 text-display-3 font-medium tracking-[-0.02em] text-band-fg">{AUTH_PANEL.heading}</h2>
          <p className="mt-4 text-body-sm text-band-muted">{AUTH_PANEL.lead}</p>

          <div data-band="paper" className="hero-shot-card mt-10 rounded-panel bg-band-raised p-6 text-band-fg">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={SAMPLE.overall} />
                <div>
                  <p className="font-semibold">{SAMPLE.verdict}</p>
                  <p className="text-sm text-band-muted">Overall score</p>
                </div>
              </div>
              <span className="rounded-pill border border-band-rule-strong px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-band-muted">
                {SAMPLE.badge}
              </span>
            </div>
            <ul className="mt-6 flex flex-col gap-3">
              {SAMPLE.criteria.map((criterion) => (
                <CriterionBar key={criterion.label} label={criterion.label} score={criterion.score} />
              ))}
            </ul>
          </div>

          <ul className="mt-10 flex flex-col gap-3">
            {AUTH_PANEL.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-band-fg">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-band-signal/25">
                  <Check className="size-3.5 text-band-signal-hover" aria-hidden="true" strokeWidth={2.5} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
