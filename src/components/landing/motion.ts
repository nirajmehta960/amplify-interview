import { useEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

/** The longest the hero entrance waits for its ground image and fonts. */
export const ENTER_CAP_MS = 900;

/**
 * Scroll reveals (one-shot) and idle animations (two-way) under `root`.
 * Only runs when `enabled`, which useLandingMotion sets only when motion is
 * wanted AND IntersectionObserver exists — so the failure mode is "visible".
 */
function useRevealObserver(root: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const node = root.current;
    if (!enabled || !node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-revealed", "");
          // One-shot: re-animating on the way back up reads as flicker.
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    node.querySelectorAll("[data-reveal]").forEach((target) => observer.observe(target));

    // Two-way: the closing panel's blobs run only while it is near the viewport.
    const idle = node.querySelectorAll("[data-animate-idle]");
    const idleObserver = idle.length
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) entry.target.setAttribute("data-animate-live", "");
              else entry.target.removeAttribute("data-animate-live");
            }
          },
          { rootMargin: "100% 0px 100% 0px" },
        )
      : undefined;
    idle.forEach((target) => idleObserver?.observe(target));

    return () => {
      observer.disconnect();
      idleObserver?.disconnect();
    };
  }, [root, enabled]);
}

/**
 * The landing root's motion classes — the ONLY owner of them, because React
 * rewrites `className` on every render and a `classList.add` elsewhere would be
 * erased.
 *
 *   ""                                           reduced motion: nothing is ever hidden
 *   "landing-enter"                              hero hidden, waiting (set during render)
 *   "landing-js landing-enter landing-entered"   released; reveals armed
 *
 * The release waits for the hero ground image and fonts, raced against
 * ENTER_CAP_MS — `decode()` can hang in a background tab, and a blank hero is
 * worse than a late one. No requestAnimationFrame: rAF does not fire in
 * background tabs.
 */
export function useLandingMotion(root: RefObject<HTMLElement>, groundSrc: string): string {
  const [{ animate, observe }] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return { animate: false, observe: false };
    }
    const wanted = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return { animate: wanted, observe: wanted && typeof IntersectionObserver !== "undefined" };
  });
  const [entered, setEntered] = useState(false);

  useRevealObserver(root, observe);

  useEffect(() => {
    if (!animate) return;
    let cancelled = false;

    const ground = new Image();
    ground.src = groundSrc;
    const settled = Promise.all([
      typeof ground.decode === "function" ? ground.decode().catch(() => undefined) : Promise.resolve(),
      document.fonts?.ready ?? Promise.resolve(),
    ]);
    const capped = new Promise<void>((resolve) => setTimeout(resolve, ENTER_CAP_MS));

    void Promise.race([settled, capped]).then(() => {
      if (!cancelled) setEntered(true);
    });

    return () => {
      cancelled = true;
    };
  }, [animate, groundSrc]);

  return cn(observe && "landing-js", animate && "landing-enter", entered && "landing-entered");
}
