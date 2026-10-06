import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The content column every shelled page sits in. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10", className)}>{children}</div>;
}

/** Page title row: the page's only h1, a muted subtitle, and its main actions. */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
