import { HOW, SECTION_IDS } from "./content";
import { Band, BandHeader, Frame } from "./kit";
import { Reveal } from "./reveal";

/** Band 4: a vertical timeline. The <ol> carries the order; the numbers are decorative. */
export function HowItWorks() {
  return (
    <Band id={SECTION_IDS.how} tone="sky">
      <div aria-hidden="true" className="net-grid pointer-events-none absolute inset-0 -z-10" />
      <Frame
        width="wide"
        className="grid max-w-[90rem] gap-14 px-4 sm:px-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20 lg:px-20"
      >
        <Reveal>
          <BandHeader
            eyebrow={HOW.eyebrow}
            heading={HOW.heading}
            lead={HOW.lead}
            leadClassName="text-body-sm text-band-muted"
            headingClassName="text-display-2 font-medium"
          />
        </Reveal>

        <ol className="flex flex-col">
          {HOW.steps.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={Math.min(i, 2) * 0.05}
              className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-5 pb-12 last:pb-0"
            >
              {i < HOW.steps.length - 1 ? (
                <span aria-hidden="true" className="absolute bottom-1 left-5 top-12 w-px -translate-x-1/2 bg-band-fg/10" />
              ) : null}
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-full border border-band-rule bg-band-raised text-sm font-semibold tabular-nums text-band-signal shadow-[var(--card-shadow)]"
              >
                {i + 1}
              </span>
              <div className="pt-1.5">
                <h3 className="text-xl font-medium text-band-fg">{step.title}</h3>
                <p className="mt-2 max-w-[34rem] text-[15px] leading-relaxed text-band-muted">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Frame>
    </Band>
  );
}
