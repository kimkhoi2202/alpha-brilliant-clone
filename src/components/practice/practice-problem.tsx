import { useEffect, useRef, useState } from "react";
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

  // Enter mirrors the footer's primary action so practice matches the lesson's
  // keyboard flow: while answering it Checks; once resolved a fresh Enter advances
  // to the Next problem (the exact action the footer button performs). This is the
  // SAME window-capture + latest-ref mechanism the lesson/quiz runners use, so
  // both surfaces behave identically. The latest-ref keeps the single listener
  // current per render without re-subscribing.
  const onEnterRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    onEnterRef.current = (e: KeyboardEvent) => {
      // Bail only for a real (modal) dialog. The always-mounted calculator is a
      // NON-modal panel (role="dialog", no aria-modal) excluded by its marker;
      // without this it would match the [role="dialog"] check and the handler
      // would bail on every press, so Enter never drove practice.
      const blockingDialogOpen = Array.from(
        document.querySelectorAll('[role="dialog"], [aria-modal="true"]'),
      ).some((el) => !el.hasAttribute("data-lesson-calculator"));
      if (blockingDialogOpen) return;
      const source = e.target;
      // Inside the calculator panel: it owns its keys (Enter = compute), so let it
      // handle the press and never advance practice from a key typed in the calc.
      if (
        source instanceof Element &&
        source.closest("[data-lesson-calculator]")
      ) {
        return;
      }
      // Defer to the ACTIVE ANSWER INPUT: a focused numeric / count-squares field
      // grades on its OWN Enter and then locks, so acting here too would check AND
      // advance on one press. Key off the fixed e.target. A range slider has no
      // own-Enter, so it is driven below like every button.
      if (
        (source instanceof HTMLInputElement && source.type !== "range") ||
        source instanceof HTMLTextAreaElement
      ) {
        return;
      }
      // Sole actor for Enter: running in the capture phase, stopping propagation
      // keeps the focused control (button onPress, answer choice, tile) from also
      // firing, so one press = one action.
      const drive = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (phase === "answering") {
        // Nothing entered yet: let the focused control handle Enter (e.g. select a
        // choice) rather than swallowing the keypress.
        if (provided) {
          drive();
          check();
        }
        return;
      }
      if (phase === "wrong") {
        drive();
        tryAgain();
        return;
      }
      // phase === "correct": advance to the next problem (the footer's action).
      drive();
      onNext();
    };
  });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key !== "Enter" ||
        e.shiftKey ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.isComposing ||
        // One physical press = one action: ignore auto-repeat from a held key, so
        // the press that grades can't also advance.
        e.repeat
      ) {
        return;
      }
      onEnterRef.current(e);
    }
    // Capture phase: handle Enter before the focused control, so when this handler
    // drives practice it can stop the event there and be the only thing that acts.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

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
