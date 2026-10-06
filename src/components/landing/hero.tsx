import { cn } from "@/lib/utils";
import { HERO, SECTION_IDS } from "./content";
import { LandingCta } from "./cta";
import { HeroShot } from "./hero-shot";
import { Band, Frame } from "./kit";
import { Enter } from "./reveal";
import { useLandingRoutes } from "./routes";

/**
 * Band 1: one label, one headline, one sentence, two actions, then the product.
 *
 * The dark comes from `hero-ground.webp`, which runs near-black at the top
 * through the blue bloom to pure white at its foot. Under it sits a CSS
 * gradient with the same shape, so the light type is readable while the 500 KB
 * image loads or if it fails — a plain white ground there made the hero white
 * text on white. It ends in white, so nothing changes at the foot. `bg-cover` is
 * load-bearing: it scales by height so the white foot always lands on the band's
 * bottom edge. `overflow-clip` (not hidden) cuts the overhanging cards without
 * making this a scroll container.
 *
 * The scrim darkens only the copy's neighbourhood: the bloom brightens toward
 * the middle and took the white supporting line below 4.5:1.
 */
export function LandingHero() {
  const routes = useLandingRoutes();

  return (
    <Band
      id={SECTION_IDS.hero}
      tone="ink"
      className="z-10 flex min-h-svh flex-col overflow-clip bg-[linear-gradient(to_bottom,#0a0f1c_0%,#142a5c_40%,#3575ee_62%,#ffffff_80%)] pb-0 pt-28 sm:pt-32 lg:pt-36"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO.groundSrc})` }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[80%] bg-[radial-gradient(60%_50%_at_50%_42%,rgb(10_15_28/0.62)_0%,rgb(10_15_28/0.38)_55%,rgb(10_15_28/0)_85%)]"
      />

      <Frame width="wide" className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Enter>
          <p className="label text-band-fg">{HERO.eyebrow}</p>
        </Enter>

        <Enter delay={0.07}>
          <h1 className="font-display text-display-1 font-medium tracking-[-0.035em] text-band-fg">
            {HERO.heading.map((line, i) => (
              <span
                key={line}
                className={cn(
                  "block",
                  // White running into a light brand blue. Transparent fill is the
                  // price of gradient type; pb keeps descenders inside the clip.
                  i === 1 && "bg-[linear-gradient(90deg,#ffffff_14%,#6b9bff_96%)] bg-clip-text pb-[0.14em] text-transparent",
                )}
              >
                {line}
                {i === 0 ? " " : null}
              </span>
            ))}
          </h1>
        </Enter>

        <Enter delay={0.14}>
          <p className="max-w-[34rem] text-pretty text-body-sm text-white">{HERO.supporting}</p>
        </Enter>

        <Enter delay={0.21} className="mt-1 flex flex-wrap items-center justify-center gap-3">
          <LandingCta to={routes.start}>
            {routes.signedIn ? HERO.primaryCtaSignedIn : HERO.primaryCta}
            <span aria-hidden="true">→</span>
          </LandingCta>
          <LandingCta
            to={HERO.secondaryCta.href}
            variant="secondary"
            className="border-white/20 bg-white/5 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/10"
          >
            {HERO.secondaryCta.label}
          </LandingCta>
        </Enter>
      </Frame>

      <Enter delay={0.3} rise={40}>
        <HeroShot className="mt-12 sm:mt-14 lg:mt-16" />
      </Enter>
    </Band>
  );
}
