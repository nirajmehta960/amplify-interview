import { ArrowUpRight, Check } from "lucide-react";
import { SCORE_COLORS } from "@/lib/score";
import { SAMPLE, SECTION_IDS } from "./content";
import { Band, BandHeader, Frame, Panel } from "./kit";
import { Reveal } from "./reveal";
import { CriterionBar, ScoreRing } from "./score-visuals";

/**
 * Band 3, in place of the reference's organisations/opportunities proof bands:
 * Amplify has no real customers to show, so the product argues for itself with
 * one illustrative, clearly badged example.
 */
export function SampleFeedback() {
  return (
    <Band id={SECTION_IDS.sample} tone="cream">
      <Frame width="wide" className="flex max-w-[90rem] flex-col gap-14 px-4 sm:px-10 lg:px-20">
        <Reveal>
          <BandHeader
            eyebrow={SAMPLE.eyebrow}
            heading={SAMPLE.heading}
            lead={SAMPLE.lead}
            leadClassName="text-body-sm text-band-muted"
            headingClassName="text-display-2 font-medium"
          />
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <Reveal>
            <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
              <p className="label text-band-signal">Question</p>
              <p className="text-lg font-medium leading-snug text-band-fg">{SAMPLE.question}</p>
              <div className="border-t border-band-rule pt-6">
                <p className="label text-band-faint">Answer excerpt</p>
                <p className="mt-3 text-[15px] leading-relaxed text-band-muted">{SAMPLE.answer}</p>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.05}>
            <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={SAMPLE.overall} />
                  <div>
                    <p className="text-lg font-semibold text-band-fg">{SAMPLE.verdict}</p>
                    <p className="text-sm text-band-muted">Overall score</p>
                  </div>
                </div>
                <span className="rounded-pill border border-band-rule-strong px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-band-muted">
                  {SAMPLE.badge}
                </span>
              </div>

              <ul className="flex flex-col gap-3">
                {SAMPLE.criteria.map((criterion) => (
                  <CriterionBar key={criterion.label} label={criterion.label} score={criterion.score} />
                ))}
              </ul>

              <div className="grid gap-6 border-t border-band-rule pt-6 sm:grid-cols-2">
                <div>
                  <p className="label text-band-signal">Strengths</p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {SAMPLE.strengths.map((strength) => (
                      <li key={strength} className="flex gap-2 text-sm leading-relaxed text-band-fg">
                        <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" strokeWidth={2} />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="label" style={{ color: SCORE_COLORS.mid.text }}>
                    To improve
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-band-fg">{SAMPLE.improvement}</p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-accent/10 px-3 py-1.5 text-sm font-semibold text-score-high-text">
                {SAMPLE.next}
                <ArrowUpRight className="size-4" aria-hidden="true" strokeWidth={2} />
              </span>
            </Panel>
          </Reveal>
        </div>
      </Frame>
    </Band>
  );
}
