import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type AnswerChipState =
  | "default"
  | "selected"
  | "correct"
  | "incorrect"
  | "blank";

const STATE: Record<AnswerChipState, string> = {
  default: "border-border bg-default text-foreground hover:bg-surface-hover",
  selected: "border-accent bg-accent-soft text-foreground",
  correct: "border-success bg-success-soft text-foreground",
  incorrect: "border-danger bg-danger-soft text-foreground",
  blank: "border-dashed border-border bg-transparent text-muted",
};

export interface AnswerChipProps {
  children: ReactNode;
  state?: AnswerChipState;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

/** A draggable/tappable token for answer banks and expression blanks. */
export function AnswerChip({
  children,
  state = "default",
  onPress,
  disabled,
  className,
}: AnswerChipProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-lg border px-3 py-1.5 font-semibold transition-colors disabled:cursor-not-allowed",
        STATE[state],
        className,
      )}
    >
      {children}
    </button>
  );
}
