import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { defaultAnswer, gradeStep, isAnswerProvided } from "../../content/engine";
import type { AnswerValue, ProblemStep } from "../../content/types";
import type { StepRecord } from "../../lib/learner";
import { FooterCtaBar } from "../chrome";
import { FeedbackToast, StepView, type StepPhase } from "../lesson";
import { Button } from "../ui";
import { renderMathText } from "../ui/math";
import { PracticeShell, type PracticeSessionStats } from "./practice-shell";

export interface PracticeProblemProps {
  /** A VERIFIED problem (already passed the firewall). Mount keyed per problem. */
  step: ProblemStep;
  stats: PracticeSessionStats;
  onExit: () => void;
  /**
   * Reports the resolved step exactly once — when solved or skipped — so the
   * session can update stats and re-derive adaptive difficulty.
   */
  onResult: (record: StepRecord) => void;
  /** Advance to the next generated problem. */
  onNext: () => void;
}

const PRIMARY_CTA_CLASS = "h-12 min-h-12 text-base";
const SECONDARY_CTA_CLASS = "h-12 min-h-12 min-w-44 px-8 text-base";

/**
 * Renders a single generated practice problem through the EXISTING lesson
 * renderer (`StepView`) and grades it with the EXISTING pure engine
 * (`gradeStep`) for instant (<100ms) feedback — identical mechanics to a lesson
 * step, just wrapped in the endless practice loop. Each problem is resolved
 * exactly once (solved or skipped) and reported back to drive session stats and
 * adaptive difficulty.
 */
export function PracticeProblem({
  step,
  stats,
  onExit,
  onResult,
  onNext,
}: PracticeProblemProps) {
  const [answer, setAnswer] = useState<AnswerValue>(() =>
    defaultAnswer(step.interaction),
  );
  const [phase, setPhase] = useState<StepPhase>("answering");
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("");
  // Guards "report exactly once" — a problem can only be solved or skipped once.
  const reportedRef = useRef(false);

  const report = (correct: boolean) => {
    if (reportedRef.current) return;
    reportedRef.current = true;
    onResult({
      attempts,
      correct,
      hintsUsed: attempts > 0,
      firstTryCorrect: correct && attempts === 0,
    });
  };

  function check() {
    // Guard the Enter path (numeric/count inputs grade on Enter): don't grade an
    // empty answer or a step that's already been graded.
    if (phase !== "answering" || !isAnswerProvided(step.interaction, answer)) {
      return;
    }
    const evaluation = gradeStep(step, answer);
    setMessage(evaluation.message);
    if (evaluation.status === "correct") {
      setPhase("correct");
      report(true);
    } else {
      setPhase("wrong");
      setAttempts((n) => n + 1);
    }
  }

  function tryAgain() {
    setPhase("answering");
    setMessage("");
  }

  function skip() {
    report(false);
    onNext();
  }

  const provided = isAnswerProvided(step.interaction, answer);

  let footer: ReactNode;
  if (phase === "answering") {
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          className={PRIMARY_CTA_CLASS}
          isDisabled={!provided}
          onPress={check}
        >
          Check
        </Button>
      </FooterCtaBar>
    );
  } else if (phase === "correct") {
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          variant="success"
          className={PRIMARY_CTA_CLASS}
          onPress={onNext}
        >
          Next problem
        </Button>
      </FooterCtaBar>
    );
  } else {
    footer = (
      <FooterCtaBar sticky={false} constrain={false} divider={false}>
        <Button
          size="lg"
          variant="secondary"
          className={SECONDARY_CTA_CLASS}
          onPress={skip}
        >
          Skip
        </Button>
        <Button
          size="lg"
          variant="warning"
          className={SECONDARY_CTA_CLASS}
          onPress={tryAgain}
        >
          Try again
        </Button>
      </FooterCtaBar>
    );
  }

  const toast =
    phase !== "answering" && message ? (
      <FeedbackToast status={phase === "correct" ? "correct" : "retryable"}>
        {renderMathText(message)}
      </FeedbackToast>
    ) : undefined;

  return (
    <PracticeShell
      stats={stats}
      onExit={onExit}
      correct={phase === "correct"}
      toast={toast}
      footer={footer}
    >
      <StepView
        step={step}
        answer={answer}
        onAnswer={setAnswer}
        phase={phase}
        onSubmit={check}
      />
    </PracticeShell>
  );
}
