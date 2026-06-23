import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Button } from "../ui";

export interface RecommendedCourseDeckProps {
  course: string;
  level?: string;
  /** Placeholder course art. */
  icon?: ReactNode;
  nextLesson?: string;
  actionLabel?: string;
  onStart?: () => void;
  className?: string;
}

/** Home hero "recommended course" card with a stacked-deck effect. */
export function RecommendedCourseDeck({
  course,
  level,
  icon,
  nextLesson,
  actionLabel = "Start",
  onStart,
  className,
}: RecommendedCourseDeckProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="absolute inset-x-3 -bottom-2 h-full rounded-2xl border border-border bg-surface/50"
      />
      <div
        aria-hidden
        className="absolute inset-x-1.5 -bottom-1 h-full rounded-2xl border border-border bg-surface/80"
      />
      <div className="relative rounded-2xl border border-border bg-surface p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--bp-purple-400)]">
          Recommended
        </p>
        <h3 className="mt-1 text-xl font-bold text-foreground">{course}</h3>
        {level ? (
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            {level}
          </p>
        ) : null}
        <div
          className="my-5 grid h-28 place-items-center rounded-xl bg-default text-5xl"
          aria-hidden
        >
          {icon ?? "📘"}
        </div>
        {nextLesson ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted">
            <span aria-hidden>▶</span>
            {nextLesson}
          </div>
        ) : null}
        <Button fullWidth onPress={onStart}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
