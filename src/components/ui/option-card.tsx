import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface OptionCardProps {
  /** Placeholder option art. */
  icon?: ReactNode;
  label: string;
  description?: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Selectable tile (onboarding goal picker, multi-card choices). */
export function OptionCard({
  icon,
  label,
  description,
  selected = false,
  onPress,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-2xl border p-5 text-center transition-colors",
        selected
          ? "border-accent bg-accent-soft text-foreground ring-1 ring-accent"
          : "border-border bg-surface text-foreground hover:bg-surface-hover",
        className,
      )}
    >
      {icon ? (
        <span className="text-3xl" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="font-semibold">{label}</span>
      {description ? (
        <span className="text-sm text-muted">{description}</span>
      ) : null}
    </button>
  );
}
