import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface CounterProps {
  /** Leading value (e.g. streak count). */
  value: ReactNode;
  /** Trailing icon (placeholder art for now). */
  icon?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/** Top-nav stat pill (Brilliant's streak / energy / gem counters). */
export function Counter({
  value,
  icon,
  className,
  "aria-label": ariaLabel,
}: CounterProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm font-bold text-foreground",
        className,
      )}
    >
      <span className="tabular-nums">{value}</span>
      {icon ? (
        <span className="grid size-4 place-items-center text-base leading-none">
          {icon}
        </span>
      ) : null}
    </span>
  );
}
