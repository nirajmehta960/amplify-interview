import { Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FAQ, SECTION_IDS, type FaqEntry } from "./content";
import { Band, BandHeader, Frame } from "./kit";
import { Reveal } from "./reveal";

function FaqRow({
  entry,
  open,
  onToggle,
  delay,
}: {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
  delay: number;
}) {
  const questionId = `faq-${entry.slug}-q`;
  const answerId = `faq-${entry.slug}-a`;

  return (
    <li className="border-t border-band-rule">
      <Reveal delay={delay}>
        {/* The h3 wraps the button: headings list gives the questions, and the
            same element is what gets pressed. */}
        <h3>
          <button
            type="button"
            id={questionId}
            aria-expanded={open}
            aria-controls={answerId}
            onClick={onToggle}
            className="group flex w-full items-start justify-between gap-6 rounded-[0.25rem] py-6 text-left sm:gap-10"
          >
            <span className="text-[1.0625rem] font-medium leading-[1.45] tracking-[-0.011em] text-band-fg sm:text-[1.1875rem]">
              {entry.question}
            </span>
            <Plus
              aria-hidden="true"
              strokeWidth={1.5}
              className={cn(
                "mt-1 size-5 shrink-0 transition-[transform,color] duration-300 ease-plaza",
                open ? "rotate-45 text-band-signal" : "text-band-faint group-hover:text-band-fg",
              )}
            />
          </button>
        </h3>
        {/* Height and visibility are owned by .landing-faq-panel in landing.css. */}
        <div
          id={answerId}
          role="region"
          aria-labelledby={questionId}
          data-open={open ? "" : undefined}
          className="landing-faq-panel"
        >
          <div className="overflow-hidden">
            <p className="max-w-[44rem] pb-7 pr-6 text-[0.9375rem] leading-[1.7] text-band-muted sm:pr-14">
              {entry.answer}
            </p>
          </div>
        </div>
      </Reveal>
    </li>
  );
}

/** Band 5: after the argument, not inside it. */
export function Faq() {
  const [openSlug, setOpenSlug] = useState<string | null>(FAQ.entries[0]?.slug ?? null);

  return (
    <Band id={SECTION_IDS.faq} tone="cream">
      <Frame width="wide" className="max-w-[90rem] px-4 sm:px-10 lg:px-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-x-20">
          <Reveal>
            <BandHeader
              eyebrow={FAQ.eyebrow}
              heading={FAQ.heading}
              plainHeading
              lead={FAQ.lead}
              leadClassName="text-body-sm text-band-muted"
              headingClassName="text-display-3 font-medium"
            />
          </Reveal>

          <ul className="border-b border-band-rule">
            {FAQ.entries.map((entry, i) => (
              <FaqRow
                key={entry.slug}
                entry={entry}
                open={openSlug === entry.slug}
                onToggle={() => setOpenSlug(openSlug === entry.slug ? null : entry.slug)}
                delay={Math.min(i, 2) * 0.05}
              />
            ))}
          </ul>
        </div>
      </Frame>
    </Band>
  );
}
