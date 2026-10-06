import { CLOSING, SECTION_IDS } from "./content";
import { LandingCta } from "./cta";
import { Band, Frame } from "./kit";
import { Reveal } from "./reveal";
import { useLandingRoutes } from "./routes";

/**
 * Band 6: the close, on an inset panel with a slowly drifting blue field.
 * The panel is an `ink` band, so the ink CTA inverts to near-white on it.
 * Blobs are paused until motion.ts's idle observer marks the field live.
 */
export function ClosingCta() {
  const routes = useLandingRoutes();

  return (
    <Band id={SECTION_IDS.closing} tone="cream" className="pt-0 sm:pt-0 lg:pt-0">
      <Frame width="wide" className="max-w-[90rem] px-4 sm:px-10 lg:px-20">
        <Reveal>
          <div
            data-band="ink"
            className="relative isolate overflow-hidden rounded-[20px] bg-[#0B1733] px-6 py-20 text-center sm:px-12 sm:py-28"
          >
            <div aria-hidden="true" data-animate-idle="" className="landing-fluid">
              <span className="landing-fluid-b" />
              <span className="landing-fluid-a" />
              <span className="landing-fluid-c" />
            </div>
            <div aria-hidden="true" className="landing-fluid-core" />
            <div aria-hidden="true" className="landing-grain" />

            <div className="relative flex flex-col items-center gap-6">
              <h2 className="max-w-[40rem] text-display-2 font-medium tracking-[-0.02em] text-band-fg">
                {CLOSING.heading}
              </h2>
              <p className="max-w-[32rem] text-body-sm text-band-muted">{CLOSING.lead}</p>
              <LandingCta to={routes.start} variant="ink" size="lg">
                {routes.signedIn ? CLOSING.ctaSignedIn : CLOSING.cta}
                <span aria-hidden="true">→</span>
              </LandingCta>
            </div>
          </div>
        </Reveal>
      </Frame>
    </Band>
  );
}
