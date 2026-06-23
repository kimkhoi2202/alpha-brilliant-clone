import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

function LessonsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
      <path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2z" />
      <path d="M18 3v16" />
    </svg>
  );
}

function ExercisesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </svg>
  );
}

export interface CourseCardProps {
  /** Placeholder course art. */
  icon?: ReactNode;
  title: string;
  description?: string;
  lessons?: number;
  exercises?: number;
  onPress?: () => void;
  className?: string;
}

/** Course summary card (icon, title, blurb, lesson/exercise counts). */
export function CourseCard({
  icon,
  title,
  description,
  lessons,
  exercises,
  onPress,
  className,
}: CourseCardProps) {
  const classes = cn(
    "flex w-full flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-6 text-left",
    onPress && "cursor-pointer transition-colors hover:bg-surface-hover",
    className,
  );
  const content = (
    <>
      <div className="grid size-14 place-items-center rounded-xl bg-default text-2xl" aria-hidden>
        {icon ?? "📘"}
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {lessons != null || exercises != null ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-muted">
          {lessons != null ? (
            <span className="inline-flex items-center gap-1.5">
              <LessonsIcon />
              {lessons.toLocaleString()} Lessons
            </span>
          ) : null}
          {exercises != null ? (
            <span className="inline-flex items-center gap-1.5">
              <ExercisesIcon />
              {exercises.toLocaleString()} Exercises
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <button type="button" onClick={onPress} className={classes}>
        {content}
      </button>
    );
  }
  return <div className={classes}>{content}</div>;
}
