import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One element in the hero's load sequence. `rise` overrides travel for large elements. */
export function Enter({
  as: Component = "div",
  delay = 0,
  rise,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  rise?: number;
  className?: string;
  children: ReactNode;
}) {
  const style: Record<string, string> = {};
  if (delay) style["--enter-delay"] = `${delay}s`;
  if (rise !== undefined) style["--enter-rise"] = `${rise}px`;
  return (
    <Component
      data-enter=""
      style={Object.keys(style).length ? (style as CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}

/** One scroll-revealed element. Delay is a custom property so any stagger works. */
export function Reveal({
  as: Component = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Component
      data-reveal=""
      style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined}
      className={cn(className)}
    >
      {children}
    </Component>
  );
}
