import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { renderMathText } from "../ui/math";

function LessonsIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-4 opacity-60 [fill:var(--foreground)]"
      aria-hidden
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M42 35H16V2H42V35ZM21 20H37V11H21V20Z" />
      <path d="M13 2V35H12C9.79086 35 8 36.7909 8 39V40H6V8C6 4.68629 8.68629 2 12 2H13Z" data-color="color-2" />
      <path d="M40.2861 35.7715L39.7559 36.6562C38.5211 38.7145 38.5211 41.2855 39.7559 43.3438L40.2861 44.2285L37.7139 45.7715L37.1836 44.8877C35.3785 41.8792 35.3785 38.1208 37.1836 35.1123L37.7139 34.2285L40.2861 35.7715Z" />
      <path d="M6 40C6 36.6863 8.68629 34 12 34H42V37H12C10.3431 37 9 38.3431 9 40C9 41.6569 10.3431 43 12 43H42V46H12C8.68629 46 6 43.3137 6 40Z" />
    </svg>
  );
}

function ExercisesIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-4 opacity-60 [fill:var(--foreground)]"
      aria-hidden
    >
      <path d="M7.02967 38.849L9.15099 40.9703L5.96901 44.1523L3.84769 42.031L7.02967 38.849Z" data-color="color-2" />
      <path d="M3.49396 34.6066L6.32239 31.7782L16.2219 41.6777L13.3935 44.5061C12.2219 45.6777 10.3224 45.6777 9.15082 44.5061L3.49396 38.8493C2.32239 37.6777 2.32239 35.7782 3.49396 34.6066Z" />
      <path d="M42.0333 3.84537L44.1546 5.96669L40.9706 9.15074L38.8493 7.02942L42.0333 3.84537Z" data-color="color-2" />
      <path d="M32.1317 13.7469L34.2531 15.8683L15.8683 34.253L13.747 32.1317L32.1317 13.7469Z" data-color="color-2" />
      <path d="M34.6066 3.49384L31.7782 6.32227L41.6777 16.2218L44.5061 13.3933C45.6777 12.2218 45.6777 10.3223 44.5061 9.15069L38.8492 3.49384C37.6777 2.32227 35.7782 2.32227 34.6066 3.49384Z" />
      <path d="M14.8076 43.0919C15.9791 44.2634 17.8786 44.2634 19.0502 43.0919L20.4644 41.6776C21.636 40.5061 21.636 38.6066 20.4644 37.435L10.5649 27.5355C9.39335 26.3639 7.49386 26.3639 6.32228 27.5355L4.90807 28.9497C3.7365 30.1213 3.7365 32.0208 4.90807 33.1924L14.8076 43.0919Z" />
      <path d="M43.0918 14.8076C44.2634 15.9791 44.2634 17.8786 43.0918 19.0502L41.6776 20.4644C40.506 21.636 38.6065 21.636 37.435 20.4644L27.5355 10.5649C26.3639 9.39335 26.3639 7.49386 27.5355 6.32228L28.9497 4.90807C30.1213 3.7365 32.0208 3.7365 33.1923 4.90807L43.0918 14.8076Z" />
    </svg>
  );
}

export interface CourseCardProps {
  /** Course hero art (preferred). Falls back to `icon` in a tinted tile. */
  art?: ReactNode;
  /** Placeholder course art (emoji/glyph) when `art` is not supplied. */
  icon?: ReactNode;
  title: string;
  description?: string;
  lessons?: number;
  exercises?: number;
  onPress?: () => void;
  className?: string;
}

/** Course summary card (hero art, title, blurb, lesson/exercise counts). */
export function CourseCard({
  art,
  icon,
  title,
  description,
  lessons,
  exercises,
  onPress,
  className,
}: CourseCardProps) {
  const classes = cn(
    "flex w-full flex-col items-start gap-5 rounded-2xl border-2 border-border bg-background p-6 text-left",
    onPress && "cursor-pointer transition-colors hover:bg-surface",
    className,
  );
  const content = (
    <>
      {art ? (
        <div aria-hidden>{art}</div>
      ) : (
        <div className="grid size-16 place-items-center rounded-2xl bg-default text-3xl" aria-hidden>
          {icon ?? "📘"}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="text-2xl font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-sm leading-relaxed text-muted">
            {renderMathText(description)}
          </p>
        ) : null}
      </div>
      {lessons != null || exercises != null ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm font-medium text-muted">
          {lessons != null ? (
            <span className="inline-flex items-center gap-2">
              <LessonsIcon />
              {lessons.toLocaleString()} Lessons
            </span>
          ) : null}
          {exercises != null ? (
            <span className="inline-flex items-center gap-2">
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
