import { cn } from "@/lib/utils";

const LEVELS = { easy: 1, medium: 2, hard: 3 } as const;

/**
 * Question difficulty as 1–3 bars on a neutral chip. Deliberately not on the
 * score scale: "hard" is a level, not a bad result, so it must not be red.
 */
export function DifficultyChip({ level, className }: { level: string; className?: string }) {
  const key = (level in LEVELS ? level : "medium") as keyof typeof LEVELS;
  const filled = LEVELS[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-xs font-medium capitalize text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            data-filled={i <= filled ? "" : undefined}
            className={cn("w-[3px] rounded-sm", i <= filled ? "bg-primary" : "bg-border")}
            style={{ height: `${4 + i * 3}px` }}
          />
        ))}
      </span>
      {key}
    </span>
  );
}
