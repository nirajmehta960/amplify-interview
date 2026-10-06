import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_COLORS, scoreBand } from "@/lib/score";
import { cn } from "@/lib/utils";
import { CARD } from "./styles";


export interface Tile {
  label: string;
  /** Text to show; "—" when there is nothing to report yet. */
  value: string;
  icon: LucideIcon;
  /** Colour the value by the score scale. */
  score?: number | null;
}

/** A row of headline numbers, laid out like the dashboard's tiles. */
export function StatTileRow({ tiles, className }: { tiles: Tile[]; className?: string }) {
  return (
    <ul className={cn("grid gap-4", tiles.length === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4", className)}>
      {tiles.map((tile) => {
        const band = typeof tile.score === "number" ? scoreBand(tile.score) : undefined;
        return (
          <li key={tile.label} className={cn(CARD, "p-5")}>
            <tile.icon className="size-5 text-accent" aria-hidden="true" />
            <p className="mt-4 text-sm text-muted-foreground">{tile.label}</p>
            <p
              data-score-band={band}
              className={cn(
                "mt-1 font-semibold tracking-[-0.02em] text-foreground",
                tile.value.length > 8 ? "text-lg leading-snug" : "text-[1.75rem] leading-none",
              )}
              style={band ? { color: SCORE_COLORS[band].text } : undefined}
            >
              {tile.value}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function StatTileSkeleton({ count }: { count: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading" className={cn("grid gap-4", count === 3 ? "sm:grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <Skeleton className="h-[124px] rounded-2xl" />
        </li>
      ))}
    </ul>
  );
}

/** A titled card; its h2 names the region for screen readers. */
export function Section({
  id,
  title,
  description,
  aside,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className={cn(CARD, className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`${id}-heading`} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** What a section says before it has data — an honest sentence, not an empty chart. */
export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-5 rounded-xl bg-secondary/50 p-6 text-center text-sm text-muted-foreground", className)}>{children}</p>;
}
