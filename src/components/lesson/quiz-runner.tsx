import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { defaultAnswer, gradeStep, isAnswerProvided } from "../../content/engine";
import { QUIZ_PASS_THRESHOLD } from "../../content/quizzes";
import type { AnswerValue, ProblemStep } from "../../content/types";
import { FooterCtaBar } from "../chrome";
import { Button } from "../ui";
import { renderMathText } from "../ui/math";
import type { KojiHandle } from "./ask-koji";
import { ExitLessonDialog } from "./exit-lesson-dialog";
import { FeedbackToast } from "./feedback-toast";
import { LessonShell } from "./lesson-shell";
import { QuizResults } from "./quiz-results";
import { StepView, type StepPhase } from "./step-view";

export interface QuizRunnerProps {
  /** The recap questions for this lesson (plain problem steps). */
  questions: ProblemStep[];
  /** Score needed to pass (defaults to 4 of 5). */
  passThreshold?: number;
  /** Heading on the quiz intro screen (defaults to "Lesson quiz"). */
  introTitle?: string;
  /** Final lesson of the path → Koji waves goodbye before the celebration. */
  isFinalLesson?: boolean;
  /**
   * "quiz" (default) gates a lesson behind a passing score; "review" reuses the
   * same one-at-a-time runner as a spaced-review session: no pass gate (every
   * retrieval already counts), review-framed copy, and a per-question callback.
   */
  mode?: "quiz" | "review";
  /**
   * Preserve the caller's question order instead of shuffling each attempt.
   * Spaced reviews and the cumulative level review are pre-interleaved by their
   * builders (round-robin across skills), so a re-shuffle would destroy that
   * deliberate alternation. Defaults to true in review mode; recap quizzes still
   * shuffle. The level review opts in explicitly (it runs in "quiz" mode for its
   * pass gate, but its order is still builder-interleaved).
   */
  preserveOrder?: boolean;
  /**
   * Overrides the intro screen's body copy. The review session uses this so a
   * single-skill "Practice" session reads correctly ("Focused practice on X")
   * rather than the multi-skill "across your due skills" default.
   */
  introBody?: string;
  /**
   * Fires once per graded question with its outcome (Phase 3). The review
   * session uses this to feed each skill's FSRS memory via `recordReview`.
   */
  onQuestionGraded?: (question: ProblemStep, correct: boolean) => void;
  /** Learner passed → proceed to the lesson-complete celebration; gets the score. */
  onPassed: (score: number) => void;
  /** Leave the quiz (back to the course map). */
  onExit: () => void;
}

/** Quiz lifecycle: a one-time intro, the questions, then the scored result. */
type QuizPhase = "intro" | "question" | "results";

const PRIMARY_CTA = "h-12 min-h-12 text-base";
const SECONDARY_CTA = "h-12 min-h-12 min-w-44 px-8 text-base";

/** Fisher–Yates shuffle (new array): reshuffles the question order each attempt. */
function shuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The required, scored end-of-lesson quiz. It presents the lesson's five recap
 * questions one at a time, grading each with the same `gradeStep` engine the
 * lesson uses (rendered through the same `StepView`), tracks the score, and
 * gates the lesson-complete celebration on a passing score.
 *
 * It's deliberately *test-like*: a brief correct/incorrect mark and advance,
 * rather than the lesson's full hint / "see answer" / retry-the-step flow.
 */
export function QuizRunner({
  questions,
  passThreshold = QUIZ_PASS_THRESHOLD,
  introTitle = "Lesson quiz",
  isFinalLesson = false,
  mode = "quiz",
  preserveOrder = mode === "review",
  introBody,
  onQuestionGraded,
  onPassed,
  onExit,
}: QuizRunnerProps) {
  const isReview = mode === "review";
  const total = questions.length;
  const [phase, setPhase] = useState<QuizPhase>("intro");
  const [order, setOrder] = useState<ProblemStep[]>(() =>
    preserveOrder ? questions : shuffle(questions),
  );
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [answer, setAnswer] = useState<AnswerValue | null>(null);
  const [qPhase, setQPhase] = useState<StepPhase>("answering");
  const [message, setMessage] = useState("");
  const [confirmExit, setConfirmExit] = useState(false);
  const kojiRef = useRef<KojiHandle | null>(null);
  // Latches once Koji's goodbye wave has fired on the passed results screen, so
  // it plays exactly once (final lesson only).
  const hasWavedRef = useRef(false);

  const question = phase === "question" ? order[current] : null;
  const score = results.filter(Boolean).length;
  // A review session has no pass gate: finishing it always "passes" (each
  // retrieval already counted toward the schedule).
  const passed = isReview || score >= passThreshold;
  const isLast = current === total - 1;
  const graded = qPhase !== "answering";

  const provided =
    question && qPhase === "answering" && answer
      ? isAnswerProvided(question.interaction, answer)
      : false;

  // On the final lesson, Koji waves goodbye the moment the passing results
  // screen appears, so it plays as a celebration while the learner reads their
  // score. Fire-and-forget (Continue no longer waits); the ref latches so the
  // wave fires exactly once even as the effect re-runs.
  useEffect(() => {
    if (!isFinalLesson || phase !== "results" || !passed) return;
    if (hasWavedRef.current) return;
    const koji = kojiRef.current;
    if (!koji) return;
    hasWavedRef.current = true;
    koji.wave();
  }, [isFinalLesson, phase, passed]);

  function beginAttempt() {
    const next = preserveOrder ? questions : shuffle(questions);
    setOrder(next);
    setCurrent(0);
    setResults([]);
    setAnswer(defaultAnswer(next[0].interaction));
    setQPhase("answering");
    setMessage("");
    setPhase("question");
  }

  function check() {
    if (!question || qPhase !== "answering" || !answer) return;
    const evaluation = gradeStep(question, answer);
    const correct = evaluation.status === "correct";
    setQPhase(correct ? "correct" : "wrong");
    setMessage(correct ? "Correct!" : "Not quite.");
    setResults((prev) => {
      const copy = prev.slice();
      copy[current] = correct;
      return copy;
    });
    // Phase 3: report each outcome so a review session can feed FSRS per skill.
    onQuestionGraded?.(question, correct);
    if (correct) kojiRef.current?.success();
    else kojiRef.current?.incorrect();
  }

  function nextQuestion() {
    const next = current + 1;
    if (next >= total) {
      setPhase("results");
      return;
    }
    setCurrent(next);
    setAnswer(defaultAnswer(order[next].interaction));
    setQPhase("answering");
    setMessage("");
  }

  // Enter mirrors the footer's primary action, matching the lesson's keyboard
  // flow. Latest-ref pattern keeps the single window listener current per render.
  const onEnterRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    onEnterRef.current = (e: KeyboardEvent) => {
      // Bail only for a real (modal) dialog - e.g. the exit-confirm modal. The
      // always-mounted calculator is a NON-modal panel (role="dialog", no
      // aria-modal) and is excluded by its marker; otherwise it matched the old
      // [role="dialog"] check and the window handler bailed on every screen.
      const blockingDialogOpen = Array.from(
        document.querySelectorAll('[role="dialog"], [aria-modal="true"]'),
      ).some((el) => !el.hasAttribute("data-lesson-calculator"));
      if (blockingDialogOpen) return;
      // Defer to the ACTIVE ANSWER INPUT only: a focused numeric / count-squares
      // text field grades on its own Enter and disables itself, so acting here too
      // would grade AND advance on one press. Key off the fixed e.target (not
      // document.activeElement, already dropped to <body>). A range slider has no
      // own-Enter, so it is driven below like every button.
      const source = e.target;
      // Inside the calculator panel: it owns its keys (Enter = compute), so let it
      // handle the keypress and never advance the quiz from a key typed in the calc.
      if (source instanceof Element && source.closest("[data-lesson-calculator]")) {
        return;
      }
      if (
        (source instanceof HTMLInputElement && source.type !== "range") ||
        source instanceof HTMLTextAreaElement
      ) {
        return;
      }
      // Sole actor for Enter: running in the capture phase, stopping propagation
      // keeps the focused control (native button click, react-aria onPress, SVG
      // role="button", calc key) from also firing, so one press = one action.
      const drive = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (phase === "intro") {
        drive();
        beginAttempt();
        return;
      }
      if (phase === "results") {
        drive();
        if (passed) onPassed(score);
        else beginAttempt();
        return;
      }
      // phase === "question"
      if (qPhase === "answering") {
        // Nothing chosen yet: let the focused control handle Enter (e.g. select).
        if (provided) {
          drive();
          check();
        }
        return;
      }
      drive();
      nextQuestion();
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
        // One physical press = one action: ignore auto-repeat from a held key.
        e.repeat
      ) {
        return;
      }
      onEnterRef.current(e);
    }
    // Capture phase: handle Enter before the focused control, so driving the quiz
    // can stop the event there and be the only thing that acts on the keypress.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  let progress: number;
  if (phase === "intro") progress = 0;
  else if (phase === "results") progress = 100;
  else progress = ((current + (graded ? 1 : 0)) / total) * 100;

  let body: ReactNode;
  let footer: ReactNode;

  if (phase === "intro") {
    body = (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {introTitle}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted">
          {introBody ??
            (isReview
              ? `Recall ${total} question${total === 1 ? "" : "s"} from memory across your due skills. No hints — pulling the answer out is the point.`
              : `Answer ${total} quick questions to finish the lesson. Score ${passThreshold} out of ${total} to pass. You can retry if you miss it.`)}
        </p>
      </div>
    );
    footer = (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          className={PRIMARY_CTA}
          onPress={beginAttempt}
        >
          {isReview ? "Start review" : "Start quiz"}
        </Button>
      </FooterCtaBar>
    );
  } else if (phase === "results") {
    body = (
      <QuizResults
        score={score}
        total={total}
        passThreshold={passThreshold}
        passed={passed}
        mode={mode}
      />
    );
    footer = passed ? (
      <FooterCtaBar sticky={false} divider={false}>
        <Button
          fullWidth
          size="lg"
          variant="success"
          className={PRIMARY_CTA}
          onPress={() => onPassed(score)}
        >
          Continue
        </Button>
      </FooterCtaBar>
    ) : (
      <FooterCtaBar sticky={false} constrain={false} divider={false}>
        <Button
          size="lg"
          variant="secondary"
          className={SECONDARY_CTA}
          onPress={() => setConfirmExit(true)}
        >
          Exit
        </Button>
        <Button
          size="lg"
          variant="accent"
          className={SECONDARY_CTA}
          onPress={beginAttempt}
        >
          Retry quiz
        </Button>
      </FooterCtaBar>
    );
  } else if (question) {
    body = (
      <div className="flex flex-col">
        <p className="px-4 pt-2 text-center text-sm font-semibold uppercase tracking-wider text-muted tabular-nums">
          Question {current + 1} of {total}
        </p>
        <StepView
          step={question}
          answer={answer}
          onAnswer={setAnswer}
          phase={qPhase}
          onSubmit={check}
        />
      </div>
    );
    if (qPhase === "answering") {
      footer = (
        <FooterCtaBar sticky={false} divider={false}>
          <Button
            fullWidth
            size="lg"
            className={PRIMARY_CTA}
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
            variant={qPhase === "correct" ? "success" : "primary"}
            className={PRIMARY_CTA}
            onPress={nextQuestion}
          >
            {isLast ? "See results" : "Continue"}
          </Button>
        </FooterCtaBar>
      );
    }
  }

  const toast =
    phase === "question" && graded && message ? (
      <FeedbackToast
        status={qPhase === "correct" ? "correct" : "retryable"}
        className="max-w-xs"
      >
        {renderMathText(message)}
      </FeedbackToast>
    ) : undefined;

  return (
    <>
      <LessonShell
        progress={progress}
        onClose={() => setConfirmExit(true)}
        correct={phase === "question" && qPhase === "correct"}
        toast={toast}
        footer={footer}
        kojiRef={kojiRef}
      >
        {body}
      </LessonShell>
      <ExitLessonDialog
        isOpen={confirmExit}
        onOpenChange={setConfirmExit}
        onQuit={onExit}
      />
    </>
  );
}
