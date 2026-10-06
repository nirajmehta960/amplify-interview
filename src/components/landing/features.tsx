import { BarChart3, ClipboardList, FileText, Gauge, Mic, TrendingUp, type LucideIcon } from "lucide-react";
import { FEATURES, SECTION_IDS } from "./content";
import { Band, BandHeader, CardGlow, Frame } from "./kit";
import { Reveal } from "./reveal";

/** Parallel to FEATURES.cards by position. Icons are decorative; the h3 carries meaning. */
const ICONS: readonly LucideIcon[] = [FileText, TrendingUp, Gauge, Mic, ClipboardList, BarChart3];

if (import.meta.env.DEV && ICONS.length !== FEATURES.cards.length) {
  console.warn(`[features] ${FEATURES.cards.length} cards but ${ICONS.length} icons.`);
}

/**
 * Band 2. `paper` because it receives the hero's white foot. The bottom ramp
 * starts transparent and ends on the exact cream of the next band, so the
 * boundary is cream-on-cream and cannot show an edge. Its height tracks this
 * band's bottom padding — change one, change both.
 */
export function Features() {
  return (
    <Band id={SECTION_IDS.features} tone="paper" className="pb-40 sm:pb-48 lg:pb-56">
      <CardGlow />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_bottom,rgb(250_246_238/0)_0%,rgb(250_246_238/0.1)_22%,rgb(250_246_238/0.34)_46%,rgb(250_246_238/0.66)_70%,rgb(250_246_238/0.9)_87%,rgb(250_246_238)_100%)] sm:h-48 lg:h-56"
      />

      <Frame width="wide" className="flex max-w-[90rem] flex-col gap-[72px] px-4 sm:px-10 lg:px-20">
        <Reveal>
          <BandHeader
            eyebrow={FEATURES.eyebrow}
            heading={FEATURES.heading}
            headingClassName="text-[clamp(2.25rem,1.65rem+2.7vw,3.5rem)] font-medium leading-[1.04]"
            plainHeading
            lead={FEATURES.lead}
            leadClassName="text-body-sm text-band-muted"
            align="center"
            className="mx-auto"
          />
        </Reveal>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.cards.map((card, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal as="li" key={card.title} delay={Math.min(i, 2) * 0.05}>
                <div className="flex h-full flex-col gap-9 rounded-xl border border-band-rule bg-white/70 p-6">
                  {Icon ? (
                    <span className="grid size-[52px] shrink-0 place-items-center rounded-tile border-[1.5px] border-band-rule bg-white">
                      <Icon className="size-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  ) : null}
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-xl font-medium leading-tight text-band-fg">{card.title}</h3>
                    <p className="text-[15px] leading-relaxed text-band-muted">{card.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </Frame>
    </Band>
  );
}
