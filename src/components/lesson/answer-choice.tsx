import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type AnswerChoiceState =
  | "default"
  | "selected"
  | "correct"
  | "incorrect";

// Brilliant's MCQ choices are outlined, not filled: an unselected choice is
// transparent (same as the surface) with a hairline border; the selected one
// keeps a clean blue edge (border + an *inset* ring → ~2px, no outer glow) over
// a barely-there blue tint. correct/incorrect mirror that with green/gold.
const STATE: Record<AnswerChoiceState, string> = {
  default: "border-border bg-transparent hover:bg-surface",
  selected: "border-accent bg-accent-soft ring-1 ring-inset ring-accent",
  correct: "border-success bg-success-soft ring-1 ring-inset ring-success",
  incorrect: "border-warning bg-warning-soft ring-1 ring-inset ring-warning",
};

function StateBadge({ state }: { state: AnswerChoiceState }) {
  if (state === "correct") {
    return (
      <span
        className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-success text-[0.7rem] font-bold text-success-foreground"
        aria-hidden
      >
        ✓
      </span>
    );
  }
  if (state === "incorrect") {
    return (
      <span
        className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-warning text-[0.7rem] font-bold text-warning-foreground"
        aria-hidden
      >
        ✕
      </span>
    );
  }
  return null;
}

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
        "relative flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-medium text-foreground transition-colors disabled:cursor-not-allowed",
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
      <StateBadge state={state} />
    </button>
  );
}
