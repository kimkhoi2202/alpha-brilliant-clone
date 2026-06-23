import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type AnswerChoiceState =
  | "default"
  | "selected"
  | "correct"
  | "incorrect";

const STATE: Record<AnswerChoiceState, string> = {
  default: "border-border bg-surface hover:bg-surface-hover",
  selected: "border-accent bg-accent-soft ring-1 ring-accent",
  correct: "border-success bg-success-soft",
  incorrect: "border-danger bg-danger-soft",
};

export interface AnswerChoiceProps {
  children: ReactNode;
  state?: AnswerChoiceState;
  /** Optional leading slot (e.g. an index letter or icon). */
  leading?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

/** A selectable multiple-choice option (single/multi-select answer list). */
export function AnswerChoice({
  children,
  state = "default",
  leading,
  onPress,
  disabled,
  className,
}: AnswerChoiceProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-pressed={state === "selected"}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium text-foreground transition-colors disabled:cursor-not-allowed",
        STATE[state],
        className,
      )}
    >
      {leading ? (
        <span className="grid size-6 shrink-0 place-items-center text-sm text-muted">
          {leading}
        </span>
      ) : null}
      <span className="flex-1">{children}</span>
    </button>
  );
}
