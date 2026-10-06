import { Mic } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing page's structural kit. `Band` sets `data-band`, which resolves
 * every `band-*` colour inside it (landing.css), so no component names a colour.
 */

/** `ink` exists for the hero only; everything else is a light step. */
export type BandTone = "ink" | "paper" | "cream" | "sky";

export function Band({
  id,
  tone,
  ruled = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"section"> & {
  id: string;
  tone: BandTone;
  /** A hairline at the top edge, for two bands that share a ground. */
  ruled?: boolean;
}) {
  return (
    <section
      id={id}
      data-band={tone}
      className={cn(
        "relative isolate bg-band-ground text-band-fg",
        "py-20 sm:py-28 lg:py-32",
        ruled && "border-t border-band-rule",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function Frame({
  width = "default",
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { width?: "default" | "wide" | "narrow" }) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full px-4 sm:px-8 lg:px-12",
        width === "narrow" && "max-w-3xl",
        width === "default" && "max-w-6xl",
        width === "wide" && "max-w-[84rem]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  children,
  className,
  as: Component = "p",
}: {
  children: ReactNode;
  className?: string;
  as?: "p" | "span" | "div";
}) {
  return <Component className={cn("label text-band-signal", className)}>{children}</Component>;
}

/**
 * Ink running into the band's own signal colour. `pb` is required: bg-clip-text
 * clips to the text box and would shear descenders at display leading.
 */
export const HEADING_GRADIENT =
  "bg-[linear-gradient(90deg,rgb(var(--band-fg))_8%,rgb(var(--band-signal))_88%)] bg-clip-text pb-[0.12em] text-transparent";

/**
 * A band opening. Two-line headings render as ONE <h2> with block spans — two
 * <h2>s for one thought would mislead a screen reader.
 */
export function BandHeader({
  eyebrow,
  heading,
  lead,
  leadClassName,
  headingClassName,
  plainHeading = false,
  align = "start",
  className,
  children,
}: {
  eyebrow?: string;
  heading: string | readonly string[];
  lead?: string;
  leadClassName?: string;
  headingClassName?: string;
  plainHeading?: boolean;
  align?: "start" | "center";
  className?: string;
  children?: ReactNode;
}) {
  const lines = typeof heading === "string" ? [heading] : heading;
  return (
    <div className={cn("flex flex-col gap-5", align === "center" && "items-center text-center", className)}>
      {eyebrow ? <Label>{eyebrow}</Label> : null}
      <h2
        className={cn(
          "max-w-[46rem] font-display tracking-[-0.02em] text-band-fg",
          headingClassName ?? "text-display-2 font-bold",
        )}
      >
        {lines.map((line, i) => (
          <span key={line} className={cn("block", i > 0 && !plainHeading && HEADING_GRADIENT)}>
            {line}
            {i < lines.length - 1 ? " " : null}
          </span>
        ))}
      </h2>
      {lead ? (
        <p className={cn("max-w-[38rem] leading-relaxed", leadClassName ?? "text-body-lg text-band-muted")}>{lead}</p>
      ) : null}
      {children}
    </div>
  );
}

/** A card. `raised` sits on the band ground; `outline` contains other cards. */
export function Panel({
  variant = "raised",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & { variant?: "raised" | "outline" }) {
  return (
    <div
      className={cn(
        "rounded-panel border border-band-rule",
        variant === "raised" && "bg-band-raised shadow-[var(--card-shadow)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The faint colour wash behind a section. A painted PNG whose alpha peaks near
 * 31/255, stored at 480px on purpose: the browser's upscale interpolates the
 * in-between values the source lacks, which is what de-bands it. Do not export
 * it larger.
 */
export function CardGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute left-1/2 top-[66%] -z-10 w-[min(1600px,84%)] -translate-x-1/2 -translate-y-1/2",
        className,
      )}
      style={{ aspectRatio: "480 / 299" }}
    >
      <img
        src="/images/landing/section-glow.webp"
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </div>
  );
}

/**
 * Landing-only logo lockup. The public/logo*.svg files are multi-colour blue
 * and are re-drawn in a later sub-project; until then the landing uses this.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-[9px] bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)]"
      >
        <Mic className="size-4" strokeWidth={2} />
      </span>
      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">Amplify Interview</span>
    </span>
  );
}
