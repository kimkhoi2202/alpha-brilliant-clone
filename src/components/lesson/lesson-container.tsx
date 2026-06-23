import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type LessonEvaluation =
  | "unsubmitted"
  | "correct"
  | "retryable"
  | "revealed";

const RING: Record<LessonEvaluation, string> = {
  unsubmitted: "border-border",
  correct: "border-success",
  retryable: "border-warning",
  revealed: "border-[#4b4b52]",
};

const GLOW: Record<Exclude<LessonEvaluation, "unsubmitted">, string> = {
  correct: "bg-success",
  retryable: "bg-warning",
  revealed: "bg-[#4b4b52]",
};

export interface LessonContainerProps {
  /** Grading state — colors the border and a soft bottom glow (Brilliant dark). */
  evaluation?: LessonEvaluation;
  children: ReactNode;
  className?: string;
}

/** The bordered lesson panel whose ring + glow react to the grading state. */
export function LessonContainer({
  evaluation = "unsubmitted",
  children,
  className,
}: LessonContainerProps) {
  return (
    <div
      data-evaluation={evaluation}
      className={cn(
        "relative overflow-hidden rounded-3xl border-2 bg-background transition-colors duration-300",
        RING[evaluation],
        className,
      )}
    >
      {evaluation !== "unsubmitted" ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-28 opacity-40 blur-3xl",
            GLOW[evaluation],
          )}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
