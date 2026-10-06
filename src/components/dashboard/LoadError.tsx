import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Said in place of data that failed to load, so a failure never passes for an
 * empty account or a row of zeros.
 */
export function LoadError({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-wrap items-center gap-3 rounded-xl bg-secondary/60 p-4 text-sm text-foreground", className)}>
      <AlertCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
