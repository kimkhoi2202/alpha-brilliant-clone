import { useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  correctAnswer,
  defaultAnswer,
  gradeStep,
  isAnswerProvided,
  problemCount,
} from "../../content/engine";
import type { AnswerValue, Lesson, Step } from "../../content/types";
import { Button } from "../ui";
import { FooterCtaBar } from "../chrome";
import { ExitLessonDialog } from "./exit-lesson-dialog";
import { FeedbackToast } from "./feedback-toast";
import { LessonShell } from "./lesson-shell";
import { StepView, type StepPhase } from "./step-view";

export interface StepResult {
  stepId: string;
  correct: boolean;
  firstTry: boolean;
  hintsUsed: boolean;
  attempts: number;
}

export interface LessonResult {
  xpEarned: number;
  correct: number;
  total: number;
}

export interface LessonRunnerProps {
  lesson: Lesson;
  /** Resume position (defaults to 0). */
  initialStepIndex?: number;
  /** Trailing stat in the top bar (e.g. an energy counter). */
  energy?: ReactNode;
  onExit: () => void;
  /** Fires when the learner moves to a new step (drives resume persistence). */
  onStepChange?: (index: number) => void;
  /** Fires once per graded problem step (drives progress + mastery). */
  onStepGraded?: (result: StepResult) => void;
  onComplete: (result: LessonResult) => void;
}

const LESSON_PRIMARY_CTA_CLASS = "h-12 min-h-12 text-base";
const LESSON_SECONDARY_CTA_CLASS = "h-12 min-h-12 min-w-44 px-8 text-base";

/** Drives one lesson end-to-end: renders each step, grades, and advances. */
export function LessonRunner({
  lesson,
  initialStepIndex = 0,
  energy,
  onExit,
  onStepChange,
  onStepGraded,
  onComplete,
}: LessonRunnerProps) {
  const clampedStart = Math.min(
    Math.max(initialStepIndex, 0),
    lesson.steps.length - 1,
  );
  const [stepIndex, setStepIndex] = useState(clampedStart);
  const [confirmExit, setConfirmExit] = useState(false);
  const xpRef = useRef(0);
  const correctRef = useRef(0);

  const total = lesson.steps.length;
  const step = lesson.steps[stepIndex];
  const progress = Math.round((stepIndex / total) * 100);

  function advance(result: StepResult | null) {
    if (result) {
      const problemStep = step as Extract<Step, { kind: "problem" }>;
      if (result.correct) {
        xpRef.current += problemStep.xp ?? 15;
        correctRef.current += 1;
      }
      onStepGraded?.(result);
    }

    const next = stepIndex + 1;
    if (next >= total) {
      onComplete({
        xpEarned: xpRef.current,
        correct: correctRef.current,
        total: problemCount(lesson),
      });
      return;
    }
    setStepIndex(next);
    onStepChange?.(next);
  }

  return (
    <>
      <StepScreen
        key={step.id}
        step={step}
        progress={progress}
        energy={energy}
        onExit={() => setConfirmExit(true)}
        onAdvance={advance}
      />
      <ExitLessonDialog
        isOpen={confirmExit}
        onOpenChange={setConfirmExit}
        onQuit={onExit}
      />
    </>
  );
}

interface StepScreenProps {
  step: Step;
  progress: number;
  energy?: ReactNode;
  onExit: () => void;
  onAdvance: (result: StepResult | null) => void;
}

/** A single step screen — owns its own answer + grading state (reset via key). */
function StepScreen({ step, progress, energy, onExit, onAdvance }: StepScreenProps) {
  const [answer, setAnswer] = useState<AnswerValue | null>(
    step.kind === "problem" ? defaultAnswer(step.interaction) : null,
  );
  const [phase, setPhase] = useState<StepPhase>("answering");
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(false);
  const [message, setMessage] = useState("");

  function check() {
    if (step.kind !== "problem" || !answer) return;
    const evaluation = gradeStep(step, answer);
    setMessage(evaluation.message);
    if (evaluation.status === "correct") {
      setPhase("correct");
    } else {
      setPhase("wrong");
      setAttempts((n) => n + 1);
    }
  }

  function tryAgain() {
    setPhase("answering");
    setHintsUsed(true);
    setMessage("");
  }

  function seeAnswer() {
    if (step.kind !== "problem") return;
    setAnswer(correctAnswer(step.interaction));
    setHintsUsed(true);
    setPhase("revealed");
    setMessage(step.feedback.default);
  }

  function continueStep() {
    if (step.kind === "concept") {
      onAdvance(null);
      return;
    }
    const correct = phase === "correct";
    onAdvance({
      stepId: step.id,
      correct,
      firstTry: correct && attempts === 0,
      hintsUsed,
      attempts,
    });
  }

  const provided =
    step.kind === "problem" && answer
      ? isAnswerProvided(step.interaction, answer)
      : false;

  let footer: ReactNode;
  if (step.kind === "concept") {
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          className={LESSON_PRIMARY_CTA_CLASS}
          onPress={continueStep}
        >
          {step.continueLabel ?? "Continue"}
        </Button>
      </FooterCtaBar>
    );
  } else if (phase === "answering") {
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          className={LESSON_PRIMARY_CTA_CLASS}
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
          className={LESSON_PRIMARY_CTA_CLASS}
          onPress={continueStep}
        >
          Continue
        </Button>
      </FooterCtaBar>
    );
  } else if (phase === "wrong") {
    footer = (
      <FooterCtaBar sticky={false} constrain={false} divider={false}>
        <Button
          size="lg"
          variant="secondary"
          className={LESSON_SECONDARY_CTA_CLASS}
          onPress={seeAnswer}
        >
          See answer
        </Button>
        <Button
          size="lg"
          variant="warning"
          className={LESSON_SECONDARY_CTA_CLASS}
          onPress={tryAgain}
        >
          Try again
        </Button>
      </FooterCtaBar>
    );
  } else {
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          className={LESSON_PRIMARY_CTA_CLASS}
          onPress={continueStep}
        >
          Continue
        </Button>
      </FooterCtaBar>
    );
  }

  const toast =
    phase !== "answering" && message ? (
      <FeedbackToast
        status={
          phase === "correct"
            ? "correct"
            : phase === "wrong"
              ? "retryable"
              : "revealed"
        }
        className="max-w-xs"
      >
        {message}
      </FeedbackToast>
    ) : undefined;

  return (
    <LessonShell
      progress={progress}
      onClose={onExit}
      energy={energy}
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
    </LessonShell>
  );
}
