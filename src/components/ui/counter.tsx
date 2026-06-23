import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface CounterProps {
  /** Leading value (e.g. streak count). */
  value: ReactNode;
  /** Trailing icon (placeholder art for now). */
  icon?: ReactNode;
  /** When provided, the pill becomes an interactive button (hover + focus). */
  onPress?: () => void;
  /** Pin the hover look while an attached popover is open. */
  isActive?: boolean;
  className?: string;
  "aria-label"?: string;
}

const PILL =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xl font-semibold leading-none text-foreground";

/** Top-nav stat pill (Brilliant's streak / energy / gem counters). */
export function Counter({
  value,
  icon,
  onPress,
  isActive,
  className,
  "aria-label": ariaLabel,
}: CounterProps) {
  const content = (
    <>
      <span className="tabular-nums">{value}</span>
      {icon ? (
        <span className="inline-flex items-center justify-center text-xl leading-none">
          {icon}
        </span>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isActive ?? undefined}
        className={cn(
          PILL,
          "cursor-pointer transition-colors hover:border-[color:var(--border-hover)] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          isActive && "border-[color:var(--border-hover)] bg-white/[0.04]",
          className,
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <span aria-label={ariaLabel} className={cn(PILL, className)}>
      {content}
    </span>
  );
}
