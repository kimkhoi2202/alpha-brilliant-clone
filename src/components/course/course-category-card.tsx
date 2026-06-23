import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface CourseCategoryCardProps {
  /** Placeholder category art. */
  icon?: ReactNode;
  label: string;
  /** Archived courses render grayscale + muted (Brilliant pattern). */
  archived?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Square course/category tile with the label beneath (course catalog grid). */
export function CourseCategoryCard({
  icon,
  label,
  archived = false,
  onPress,
  className,
}: CourseCategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "group flex w-full flex-col items-center gap-2 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "grid aspect-square w-full place-items-center rounded-2xl border border-border bg-surface text-4xl transition-transform duration-200 group-hover:-translate-y-0.5",
          archived && "opacity-80 grayscale",
        )}
        aria-hidden
      >
        {icon ?? "🧩"}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          archived ? "text-muted" : "text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
