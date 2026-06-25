import { cn } from "../../lib/cn";
import { renderMathText } from "../ui/math";
import { AnswerChoice, type AnswerChoiceState } from "./answer-choice";

export interface MultiSelectChoice {
  id: string;
  label: string;
}

/** Grading lifecycle, mirroring the lesson runner's StepPhase. */
export type MultiSelectPhase = "answering" | "correct" | "wrong" | "revealed";

export interface MultiSelectQuestionProps {
  choices: MultiSelectChoice[];
  /** Currently chosen ids (controlled). */
  selected: string[];
  /** The full correct set, supplied so a graded list can reveal what was missed. */
  correctIds?: string[];
  phase: MultiSelectPhase;
  onToggle: (id: string) => void;
  className?: string;
}

const BOX_TONE = {
  none: "border-foreground/30 text-transparent",
  accent: "border-accent bg-accent text-white",
  success: "border-success bg-success text-white",
  warning: "border-warning bg-warning text-white",
} as const;

function CheckBox({ tone }: { tone: keyof typeof BOX_TONE }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 place-items-center rounded-md border-2 transition-colors",
        BOX_TONE[tone],
      )}
    >
      <svg
        viewBox="0 0 16 16"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8.5 6.5 12 13 4.5" />
      </svg>
    </span>
  );
}

/**
 * "Select all that apply." Outlined option rows with a leading checkbox so it
 * reads as multi-select. Once graded it reveals every correct option (green)
 * and flags any wrong pick (gold), so a mistake still teaches.
 */
export function MultiSelectQuestion({
  choices,
  selected,
  correctIds,
  phase,
  onToggle,
  className,
}: MultiSelectQuestionProps) {
  const locked = phase !== "answering";
  const correctSet = new Set(correctIds ?? []);
  const selectedSet = new Set(selected);

  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col gap-3", className)}>
      {choices.map((choice) => {
        const isSelected = selectedSet.has(choice.id);
        let state: AnswerChoiceState = "default";
        let tone: keyof typeof BOX_TONE = "none";

        if (!locked) {
          state = isSelected ? "selected" : "default";
          tone = isSelected ? "accent" : "none";
        } else if (correctSet.has(choice.id)) {
          state = "correct";
          tone = "success";
        } else if (isSelected) {
          state = "incorrect";
          tone = "warning";
        }

        return (
          <AnswerChoice
            key={choice.id}
            state={state}
            align="left"
            disabled={locked}
            leading={<CheckBox tone={tone} />}
            onPress={() => onToggle(choice.id)}
          >
            {renderMathText(choice.label)}
          </AnswerChoice>
        );
      })}
    </div>
  );
}
