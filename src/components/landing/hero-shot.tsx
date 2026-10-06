import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import { HERO } from "./content";

/**
 * The product, framed: a real screenshot in a glass frame that dissolves into
 * the white band below, plus two HTML cards overhanging its edges that drift a
 * few pixels on scroll. The cards are markup, not part of the image, so they
 * stay sharp and are edited in content.ts. Below `md` the cards are hidden and
 * the screenshot crops to its left (chat) column.
 *
 * No entrance transform beyond the shared Enter fade: a perspective rotation
 * on a product screenshot reads as a slide-deck build.
 */
export function HeroShot({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const driftScore = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [12, -12]);
  const driftNext = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-8, 16]);

  const band = scoreBand(HERO.scoreCard.score);

  return (
    <div ref={ref} className={cn("relative mx-auto w-full max-w-[72rem] px-4 sm:px-8", className)}>
      {/* The nav flips to its light tone when this reaches it: from here down
          the hero is light (screenshot, white foot), so dark-tone type vanishes. */}
      <div aria-hidden="true" data-nav-sentinel="" className="absolute inset-x-0 top-0 h-px" />
      <div className="relative">
        {/* The mask is on the frame alone: a mask clips everything outside its
            element's box, so on a shared wrapper it would cut off the cards. */}
        <div className="hero-shot-mask hero-shot-still rounded-panel border border-white/15 bg-white/5 p-1.5 backdrop-blur-sm sm:p-2">
          <img
            src={HERO.shot.src}
            alt={HERO.shot.alt}
            width={HERO.shot.width}
            height={HERO.shot.height}
            decoding="async"
            {...{ fetchpriority: "high" }}
            className="block h-auto w-full rounded-tile bg-background object-cover object-left-top max-md:aspect-[4/5]"
          />
        </div>

        <motion.div
          data-band="paper"
          style={{ y: driftScore }}
          className="hero-shot-card absolute -left-4 top-[34%] hidden w-60 rounded-tile bg-band-raised p-4 text-left text-band-fg md:block xl:-left-12"
        >
          <div className="flex items-center gap-3">
            <span
              data-score-band={band}
              className="grid size-12 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(${SCORE_COLORS[band].fill} 0 ${HERO.scoreCard.score}%, hsl(var(--border)) 0)`,
              }}
            >
              <span className="grid size-[38px] place-items-center rounded-full bg-band-raised text-sm font-semibold tabular-nums">
                {HERO.scoreCard.score}
              </span>
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{HERO.scoreCard.label}</span>
              <span className="text-xs leading-snug text-band-muted">{HERO.scoreCard.detail}</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          data-band="paper"
          style={{ y: driftNext }}
          className="hero-shot-card absolute -right-4 top-[16%] hidden w-56 rounded-tile bg-band-raised p-4 text-left text-band-fg md:block xl:-right-12"
        >
          <p className="label text-band-signal">{HERO.nextCard.label}</p>
          <p className="mt-1 text-base font-semibold">
            {HERO.nextCard.value} <span aria-hidden="true">↑</span>
          </p>
          <p className="mt-1 text-xs leading-snug text-band-muted">{HERO.nextCard.detail}</p>
        </motion.div>
      </div>
    </div>
  );
}
