import { Eye, EyeOff, Lock, type LucideIcon } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type InputProps = Omit<ComponentProps<"input">, "id"> & { id: string };

const INPUT = "h-11 bg-card pl-10";

/** A labelled input with a leading icon. The label is bound by `htmlFor`. */
export function TextField({
  label,
  icon: Icon,
  hint,
  className,
  ...props
}: InputProps & { label: string; icon: LucideIcon; hint?: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{label}</Label>
      <div className="relative">
        <Icon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className={cn(INPUT, className)} {...props} />
      </div>
      {hint}
    </div>
  );
}

/**
 * A labelled password input with its own show/hide toggle. The toggle is named
 * for what it will do and reports its state with `aria-pressed`, so a screen
 * reader hears "Show password, toggle button, not pressed".
 */
export function PasswordField({
  label,
  hint,
  className,
  ...props
}: Omit<InputProps, "type"> & { label: string; hint?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{label}</Label>
      <div className="relative">
        <Lock aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type={visible ? "text" : "password"} className={cn(INPUT, "pr-11", className)} {...props} />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {hint}
    </div>
  );
}
