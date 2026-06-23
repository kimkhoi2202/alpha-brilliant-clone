import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface SurveyPillProps {
  children: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Full-width single-select survey pill (onboarding goal/role questions). */
export function SurveyPill({
  children,
  selected = false,
  onPress,
  className,
}: SurveyPillProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-full border px-5 py-3 text-left font-medium transition-colors",
        selected
          ? "border-accent bg-accent-soft text-foreground"
          : "border-border bg-surface text-foreground hover:bg-surface-hover",
        className,
      )}
    >
      {children}
    </button>
  );
}
