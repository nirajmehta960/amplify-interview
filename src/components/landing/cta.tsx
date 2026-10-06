import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type CtaVariant = "primary" | "secondary" | "ink";
type CtaSize = "sm" | "md" | "lg";

/** One control shape for every landing CTA, so radius, height and weight never drift. */
function control(variant: CtaVariant, size: CtaSize) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-pill font-medium",
    "transition-[transform,background-color,border-color,box-shadow] duration-200 ease-plaza",
    size === "sm" && "h-9 px-4 text-[0.8125rem]",
    size === "md" && "h-11 px-5 text-[0.9375rem]",
    size === "lg" && "h-12 px-6 text-[0.9375rem] sm:h-[3.25rem] sm:px-7 sm:text-base",
    variant === "primary" &&
      "landing-cta-primary bg-band-accent text-band-on-accent hover:-translate-y-0.5 hover:bg-band-accent-hover active:translate-y-0",
    variant === "secondary" &&
      "landing-cta-secondary border border-band-rule-strong text-band-fg hover:-translate-y-0.5 hover:bg-band-fg/5 active:translate-y-0",
    // The band's own ink as a fill: near-black on light bands, near-white on ink.
    variant === "ink" &&
      "landing-cta-ink bg-band-fg text-band-ground hover:-translate-y-0.5 hover:bg-band-fg/90 active:translate-y-0",
  );
}

/**
 * Hash targets stay real `<a href="#…">`: routing one through `<Link>` under
 * BrowserRouter turns an in-page scroll into a navigation that resets scroll.
 */
export function LandingCta({
  to,
  variant = "primary",
  size = "md",
  className,
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  to: string;
  variant?: CtaVariant;
  size?: CtaSize;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
  "aria-label"?: string;
}) {
  const classes = cn(control(variant, size), className);
  if (to.startsWith("#")) {
    return (
      <a href={to} className={classes} onClick={onClick} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
