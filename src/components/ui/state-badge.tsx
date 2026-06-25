import { cn } from "../../lib/cn";

export type FeedbackState = "correct" | "incorrect";

export interface StateBadgeProps {
  state: FeedbackState;
  className?: string;
}

/**
 * Small corner badge marking a graded element correct (green ✓) or incorrect
 * (gold ✕). Absolutely positioned, so the parent must be `relative`. Shared by
 * the answer choices and the numeric input so every "correct" cue looks alike.
 */
export function StateBadge({ state, className }: StateBadgeProps) {
  const correct = state === "correct";
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -right-2 -top-2 grid size-5 place-items-center rounded-full text-[0.7rem] font-bold",
        correct
          ? "bg-success text-success-foreground"
          : "bg-warning text-warning-foreground",
        className,
      )}
    >
      {correct ? "✓" : "✕"}
    </span>
  );
}
