import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface OptionRowProps {
  children: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Full-width bordered single-select row (cancel-reason / survey lists). */
export function OptionRow({
  children,
  description,
  selected = false,
  onPress,
  className,
}: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        selected
          ? "border-accent bg-accent-soft"
          : "border-border bg-surface hover:bg-surface-hover",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{children}</span>
        {description ? (
          <span className="block text-sm text-muted">{description}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border-2",
          selected ? "border-accent" : "border-border",
        )}
        aria-hidden
      >
        {selected ? <span className="size-2.5 rounded-full bg-accent" /> : null}
      </span>
    </button>
  );
}
