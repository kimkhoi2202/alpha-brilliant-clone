import { useState } from "react";
import type { ReactNode } from "react";

import {
  defaultAnswer,
  gradeStep,
  isAnswerProvided,
} from "../../content/engine";
import type { AnswerValue, ProblemStep } from "../../content/types";
import { FooterCtaBar } from "../chrome";
import {
  FeedbackToast,
  LessonShell,
  StepView,
  type StepPhase,
} from "../lesson";
import { Button } from "../ui";
import { renderMathText } from "../ui/math";

export interface RecallWarmupProps {
  /** A single (scaffold-dropped) recall question on a previously-learned skill. */
  question: ProblemStep;
  /** Skill label for the warm-up header. */
  skillLabel: string;
  /** Records the outcome and proceeds into the lesson. */
  onComplete: (correct: boolean) => void;
  /** Skip the warm-up and go straight into the lesson. */
  onSkip: () => void;
}

const PRIMARY_CTA = "h-12 min-h-12 text-base";
const SECONDARY_CTA = "h-12 min-h-12 min-w-44 px-8 text-base";

/**
 * The opening recall warm-up (Phase 3, SPOV 8): one quick, generative,
 * scaffold-dropped question on a prerequisite skill, pulled from memory *before*
 * a new lesson builds on it. Single attempt (it's retrieval, not a re-teach),
 * skippable, and AI-off-safe — it records into the skill's FSRS memory like any
 * review. Wrong answers still teach via the static misconception feedback.
 */
export function RecallWarmup({
  question,
  skillLabel,
  onComplete,
  onSkip,
}: RecallWarmupProps) {
  const [answer, setAnswer] = useState<AnswerValue>(() =>
    defaultAnswer(question.interaction),
  );
  const [phase, setPhase] = useState<StepPhase>("answering");
  const [message, setMessage] = useState("");

  const graded = phase !== "answering";
  const provided = isAnswerProvided(question.interaction, answer);

  function check() {
    if (graded || !provided) return;
    const evaluation = gradeStep(question, answer);
    setMessage(evaluation.message);
    setPhase(evaluation.status === "correct" ? "correct" : "wrong");
  }

  let footer: ReactNode;
  if (!graded) {
    footer = (
      <FooterCtaBar sticky={false} constrain={false} divider={false}>
        <Button
          size="lg"
          variant="secondary"
          className={SECONDARY_CTA}
          onPress={onSkip}
        >
          Skip
        </Button>
        <Button
          size="lg"
          variant="accent"
          className={SECONDARY_CTA}
          isDisabled={!provided}
          onPress={check}
        >
          Check
        </Button>
      </FooterCtaBar>
    );
  } else {
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          variant={phase === "correct" ? "success" : "primary"}
          className={PRIMARY_CTA}
          onPress={() => onComplete(phase === "correct")}
        >
          Start the lesson
        </Button>
      </FooterCtaBar>
    );
  }

  const toast =
    graded && message ? (
      <FeedbackToast status={phase === "correct" ? "correct" : "retryable"}>
        {renderMathText(message)}
      </FeedbackToast>
    ) : undefined;

  return (
    <LessonShell
      progress={0}
      onClose={onSkip}
      correct={phase === "correct"}
      toast={toast}
      footer={footer}
    >
      <div className="flex flex-col">
        <div className="px-4 pt-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-soft-foreground">
            Warm-up · {skillLabel}
          </span>
          <p className="mt-2 text-sm text-muted">
            A quick recall before we build on it.
          </p>
        </div>
        <StepView
          step={question}
          answer={answer}
          onAnswer={setAnswer}
          phase={phase}
          onSubmit={check}
        />
      </div>
    </LessonShell>
  );
}
