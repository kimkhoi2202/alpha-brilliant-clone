import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import {
  correctAnswer,
  defaultAnswer,
  gradeStep,
  isAnswerProvided,
  problemCount,
} from "../../content/engine";
import { getQuiz } from "../../content/quizzes";
import type { AnswerValue, Lesson, LessonId, Step } from "../../content/types";
import { aiEnabled } from "../../lib/ai/flag";
import type { KojiReactions, RevealAllowed } from "../../lib/ai/tools";
import {
  useEngagement,
  useToolContext,
} from "../../lib/ai/tools/use-tool-context";
import type { StepRecord } from "../../lib/learner";
import { Button } from "../ui";
import { renderMathText } from "../ui/math";
import { FooterCtaBar } from "../chrome";
import type { KojiHandle } from "./ask-koji";
import { ExitLessonDialog } from "./exit-lesson-dialog";
import { FeedbackToast } from "./feedback-toast";
import { KojiPanel } from "./koji";
import { LessonShell } from "./lesson-shell";
import { QuizRunner } from "./quiz-runner";
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
  /**
   * Whether this is the last lesson in the path (no "Next lesson"). Drives Koji's
   * goodbye wave when its final step is completed.
   */
  isFinalLesson?: boolean;
  /**
   * Swoop Koji in on entry. True only when launched from the map (the branded
   * transition just played); otherwise he simply settles into idle.
   */
  swoopEntrance?: boolean;
  onExit: () => void;
  /** Fires when the learner moves to a new step (drives resume persistence). */
  onStepChange?: (index: number) => void;
  /** Fires once per graded problem step (drives progress + mastery). */
  onStepGraded?: (result: StepResult) => void;
  onComplete: (result: LessonResult) => void;
}

const LESSON_PRIMARY_CTA_CLASS = "h-12 min-h-12 text-base";
const LESSON_SECONDARY_CTA_CLASS = "h-12 min-h-12 min-w-44 px-8 text-base";

// The end-of-level review is a pure quiz: it has no teaching steps, opens
// straight into the quiz, and is graded against a higher bar (8 of 10) than the
// default 5-question recap (4 of 5). Other lessons are unaffected.
const LEVEL_REVIEW_LESSON_ID = "level-review";
const LEVEL_REVIEW_QUIZ_PASS = 8;
/** XP per correct answer in a quiz-only lesson (matches a lesson problem step). */
const QUIZ_QUESTION_XP = 15;

/** Drives one lesson end-to-end: renders each step, grades, and advances. */
export function LessonRunner({
  lesson,
  initialStepIndex = 0,
  energy,
  isFinalLesson = false,
  swoopEntrance = false,
  onExit,
  onStepChange,
  onStepGraded,
  onComplete,
}: LessonRunnerProps) {
  const clampedStart = Math.min(
    Math.max(initialStepIndex, 0),
    Math.max(lesson.steps.length - 1, 0),
  );
  const [stepIndex, setStepIndex] = useState(clampedStart);
  const [confirmExit, setConfirmExit] = useState(false);
  const xpRef = useRef(0);
  const correctRef = useRef(0);
  // Koji persists across steps, so its reaction handle lives at the lesson level.
  const kojiRef = useRef<KojiHandle | null>(null);

  // A required, scored quiz gates the lesson-complete celebration. When the last
  // step finishes we stash the lesson result and hand off to the quiz; only a
  // passing score fires `onComplete`. Lessons with no quiz complete directly.
  const quiz = getQuiz(lesson.id);
  const hasQuiz = !!quiz && quiz.length > 0;
  // The level review is quiz-only: it has no teaching steps, so it opens
  // straight into the quiz and is graded at the higher 8/10 bar. Every other
  // lesson runs its steps first, then a 5-question recap at the default 4/5.
  const quizOnly = hasQuiz && lesson.id === LEVEL_REVIEW_LESSON_ID;
  const quizPassThreshold = quizOnly ? LEVEL_REVIEW_QUIZ_PASS : undefined;
  const [phase, setPhase] = useState<"lesson" | "quiz">(
    quizOnly ? "quiz" : "lesson",
  );
  const [lessonResult, setLessonResult] = useState<LessonResult | null>(null);

  const total = lesson.steps.length;
  const step = lesson.steps[stepIndex];
  const progress = Math.round((stepIndex / total) * 100);
  // The path's very last step: Koji waves goodbye on its completion. With a
  // quiz, that goodbye moves to the end of the quiz (the new final beat), so the
  // last *step* no longer waves.
  const isFinalStep = isFinalLesson && stepIndex === total - 1 && !hasQuiz;

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
      const result: LessonResult = {
        xpEarned: xpRef.current,
        correct: correctRef.current,
        total: problemCount(lesson),
      };
      // Required quiz first; only a pass proceeds to the celebration.
      if (hasQuiz) {
        setLessonResult(result);
        setPhase("quiz");
      } else {
        onComplete(result);
      }
      return;
    }
    setStepIndex(next);
    onStepChange?.(next);
  }

  // End-of-lesson quiz phase: a passing score releases the result to
  // `onComplete` (→ celebration); exiting bails back to the course map.
  if (phase === "quiz" && quiz) {
    return (
      <QuizRunner
        questions={quiz}
        passThreshold={quizPassThreshold}
        introTitle={quizOnly ? lesson.title : undefined}
        isFinalLesson={isFinalLesson}
        onExit={onExit}
        onPassed={(score) => {
          if (lessonResult) {
            onComplete(lessonResult);
            return;
          }
          // Quiz-only lesson (the level review): there's no stashed lesson-step
          // result, so the completion stats come from the quiz score itself.
          onComplete({
            xpEarned: score * QUIZ_QUESTION_XP,
            correct: score,
            total: quiz.length,
          });
        }}
      />
    );
  }

  return (
    <>
      {/* No `key={step.id}` here on purpose: the step screen persists across
          steps so Koji (inside the shell) keeps his Rive instance, entering
          once, not on every screen. StepScreen resets its own per-step state. */}
      <StepScreen
        lessonId={lesson.id}
        step={step}
        progress={progress}
        energy={energy}
        isFinalStep={isFinalStep}
        kojiSwoop={swoopEntrance}
        kojiRef={kojiRef}
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
  /** The lesson this step belongs to (for grounding + `recordStep`). */
  lessonId: LessonId;
  step: Step;
  progress: number;
  energy?: ReactNode;
  /** This step is the last one of the final lesson (drives Koji's goodbye wave). */
  isFinalStep: boolean;
  /** Swoop Koji in on his first appearance. */
  kojiSwoop: boolean;
  /** Shared handle for firing Koji reactions. */
  kojiRef: RefObject<KojiHandle | null>;
  onExit: () => void;
  onAdvance: (result: StepResult | null) => void;
}

/**
 * A single step screen: owns its own answer + grading state.
 *
 * It deliberately is *not* keyed by step id (so the surrounding shell, and thus
 * Koji's persistent Rive instance, survive step changes); instead it resets its
 * own per-step state when the step id changes.
 */
function StepScreen({
  lessonId,
  step,
  progress,
  energy,
  isFinalStep,
  kojiSwoop,
  kojiRef,
  onExit,
  onAdvance,
}: StepScreenProps) {
  // Phase 2 Koji is entirely flag-gated: with AI off, none of the interactive
  // surface below renders and the step behaves byte-for-byte like Phase 1.
  const ai = aiEnabled();

  const [renderedStepId, setRenderedStepId] = useState(step.id);
  const [answer, setAnswer] = useState<AnswerValue | null>(
    step.kind === "problem" ? defaultAnswer(step.interaction) : null,
  );
  const [phase, setPhase] = useState<StepPhase>("answering");
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(false);
  const [message, setMessage] = useState("");
  // Latches once Koji's goodbye wave has fired on the final step, so it plays
  // exactly once (final lesson without a quiz only).
  const hasWavedRef = useRef(false);

  // --- Koji (Phase 2) per-step state ---
  const [kojiOpen, setKojiOpen] = useState(false);
  // Bumped to auto-request a hint after the 2nd wrong attempt (offer, once).
  const [autoHintToken, setAutoHintToken] = useState(0);
  // Latches the one-time auto-offer so it fires once per step (state, not a ref,
  // so it resets cleanly during the step-change render below).
  const [autoOffered, setAutoOffered] = useState(false);
  // The per-step "engaged Koji?" signal that (with a real attempt) unlocks reveal.
  const engagement = useEngagement();

  // Reset per-step state when advancing to a new step. This replaces the
  // previous `key`-based remount (dropped so the shell, and Koji's persistent
  // Rive instance, survive step changes). Setting state during render makes
  // React immediately re-render with fresh state before committing, so there's
  // no flash of the prior step's answer. We don't early-return (that would skip
  // the hooks below); the discarded render is harmless: `isAnswerProvided`
  // guards on `answer.kind`, so a stale answer just reads as "not provided".
  if (renderedStepId !== step.id) {
    setRenderedStepId(step.id);
    setAnswer(step.kind === "problem" ? defaultAnswer(step.interaction) : null);
    setPhase("answering");
    setAttempts(0);
    setHintsUsed(false);
    setMessage("");
    // Reset Koji per step: close the panel, clear the auto-offer + engagement.
    // All pure setState (the engagement signal is state-backed), so this runs
    // safely as a render-phase adjustment alongside the resets above.
    setKojiOpen(false);
    setAutoHintToken(0);
    setAutoOffered(false);
    engagement.reset();
  }

  // The learner's LIVE record for this step (from the player's own state, not the
  // persisted snapshot) so the reveal effort-gate and grounding see the current
  // attempt count, not a stale write that only lands on Continue.
  const liveRecord = useMemo<StepRecord>(
    () => ({
      attempts,
      correct: phase === "correct",
      hintsUsed,
      firstTryCorrect: phase === "correct" && attempts === 0,
    }),
    [attempts, phase, hintsUsed],
  );

  // A stable `KojiReactions` that always reads the latest mascot handle, so
  // Koji's `celebrate` tool fires even though the ref is null on first render.
  const kojiReactions = useMemo<KojiReactions>(
    () => ({
      success: () => kojiRef.current?.success(),
      incorrect: () => kojiRef.current?.incorrect(),
      correctAfterIncorrect: () => kojiRef.current?.correctAfterIncorrect(),
      wave: (onDone?: () => void) => kojiRef.current?.wave(onDone),
    }),
    [kojiRef],
  );

  // Apply an unlocked Koji reveal: fill the engine-computed answer and mark the
  // step revealed (mirrors `seeAnswer`). The `revealSolution` tool has already
  // recorded the step `assisted` via `recordStep`, so it never counts as mastery.
  // Memoized so it can ride on the `ToolContext` without churning it — this is
  // what lets a VOICE reveal update the lesson exactly like the text panel does.
  const applyReveal = useCallback(
    (result: RevealAllowed) => {
      if (step.kind !== "problem") return;
      setAnswer(result.answer);
      setHintsUsed(true);
      setPhase("revealed");
      setMessage(result.worked);
    },
    [step],
  );

  // The single live `ToolContext` every Koji tool runs against.
  const toolContext = useToolContext({
    lessonId,
    step,
    answer,
    record: liveRecord,
    koji: kojiReactions,
    engagement: engagement.signal,
    onReveal: applyReveal,
  });

  // Reveal effort-gate (§2.3): a genuine attempt AND Koji engagement. The
  // `revealSolution` tool re-enforces this; this just drives the button state.
  const revealReady =
    step.kind === "problem" &&
    attempts > 0 &&
    (engagement.usedHint || engagement.talkedToKoji);

  function check() {
    if (step.kind !== "problem" || !answer) return;
    const evaluation = gradeStep(step, answer);
    setMessage(evaluation.message);
    if (evaluation.status === "correct") {
      setPhase("correct");
      // Koji reaction: a reassuring beat after a miss, otherwise a random
      // success celebration. (The final-step goodbye wave fires separately, once
      // that step's Continue appears.)
      if (attempts > 0) kojiRef.current?.correctAfterIncorrect();
      else kojiRef.current?.success();
    } else {
      setPhase("wrong");
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      // Auto-offer Koji after ≥2 wrong attempts (PRD §4.1), once per step: open
      // the panel and request a hint. AI-gated, so AI-off is unaffected.
      if (ai && nextAttempts >= 2 && !autoOffered) {
        setAutoOffered(true);
        setKojiOpen(true);
        setAutoHintToken((t) => t + 1);
      }
      kojiRef.current?.incorrect();
    }
  }

  function tryAgain() {
    setPhase("answering");
    setHintsUsed(true);
    setMessage("");
  }

  // AI-off only: the Phase 1 instant "See answer". With AI on this is replaced by
  // the effort-gated Koji reveal (`applyReveal`), so this stays untouched.
  function seeAnswer() {
    if (step.kind !== "problem") return;
    setAnswer(correctAnswer(step.interaction));
    setHintsUsed(true);
    setPhase("revealed");
    setMessage(step.feedback.default);
  }

  // Advancing no longer waits on Koji's goodbye wave; that wave fires on its own
  // when the final step's Continue appears (see effect below), so Continue always
  // advances immediately.
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

  // Final step of a quiz-less final lesson: Koji waves goodbye the moment the
  // step's Continue CTA appears (concept: right away; problem: once graded), so
  // the send-off plays while the learner is still on the screen. Fire-and-forget
  // and latched to a single wave. Advancing unmounts Koji, so it must fire here
  // rather than on Continue.
  const showsFinalContinue =
    isFinalStep &&
    (step.kind === "concept" || phase === "correct" || phase === "revealed");
  useEffect(() => {
    if (!showsFinalContinue || hasWavedRef.current) return;
    const koji = kojiRef.current;
    if (!koji) return;
    hasWavedRef.current = true;
    koji.wave();
    // kojiRef is a stable ref; listed to satisfy exhaustive-deps without churn.
  }, [showsFinalContinue, kojiRef]);

  const provided =
    step.kind === "problem" && answer
      ? isAnswerProvided(step.interaction, answer)
      : false;

  // Enter triggers the current phase's primary action (Check → Continue), so the
  // keyboard flow mirrors the footer CTA. Latest-ref pattern keeps the single
  // window listener current without re-subscribing each render.
  const onEnterRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    onEnterRef.current = (e: KeyboardEvent) => {
      // Bail only for a real (modal) dialog - e.g. the exit-confirm modal, which
      // makes the lesson inert and should own the keyboard. The calculator is a
      // NON-modal floating panel that is ALWAYS mounted (role="dialog" but no
      // aria-modal); it is excluded by its marker. Without this exclusion the
      // always-present calculator matched the old [role="dialog"] check, so the
      // window handler bailed on every screen and Enter never drove the lesson.
      const blockingDialogOpen = Array.from(
        document.querySelectorAll('[role="dialog"], [aria-modal="true"]'),
      ).some((el) => !el.hasAttribute("data-lesson-calculator"));
      if (blockingDialogOpen) return;
      // Defer to the ACTIVE ANSWER INPUT only: the numeric / count-squares text
      // field grades on its own Enter and then disables itself. If we also acted,
      // one press would grade AND advance (the original double-skip). Key off the
      // keydown's fixed e.target, not document.activeElement (disabling the field
      // has already dropped activeElement to <body> by now). A range slider has no
      // own-Enter, so it is NOT excluded - it is driven below like every button.
      const source = e.target;
      // Inside the calculator panel: it owns its keys (Enter = compute, etc.), so
      // let it handle the keypress and never drive the lesson from a key typed while
      // the calc holds focus. Once the user clicks back on the lesson, focus leaves
      // the calc and Enter drives the lesson again.
      if (source instanceof Element && source.closest("[data-lesson-calculator]")) {
        return;
      }
      if (
        (source instanceof HTMLInputElement && source.type !== "range") ||
        source instanceof HTMLTextAreaElement
      ) {
        return;
      }
      // Otherwise this handler is the SOLE actor for Enter. It runs in the capture
      // phase, so stopping propagation prevents the focused control (a native
      // button's click, a react-aria onPress, an SVG role="button" onKeyDown, or a
      // calculator key) from ALSO firing. That is what makes "Enter drives the
      // lesson" reliable from any focus - answer choice / tile / triangle / calc
      // button / Continue / body - without a double action.
      const drive = () => {
        e.preventDefault();
        e.stopPropagation();
      };
      if (step.kind === "concept") {
        drive();
        continueStep();
        return;
      }
      if (phase === "answering") {
        // Nothing chosen yet: let the focused control handle Enter (e.g. select a
        // choice / place a tile) rather than swallowing the keypress.
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
      drive();
      continueStep(); // correct | revealed
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
        // Holding Enter fires a stream of auto-repeat keydowns. Ignoring them is
        // what enforces one physical press = one action: the press that grades
        // can't also advance, since advancing requires a separate, fresh press.
        e.repeat
      ) {
        return;
      }
      onEnterRef.current(e);
    }
    // Capture phase: see the Enter before the focused control does, so that when
    // this handler drives the lesson it can stop the event there (above) and be
    // the only thing that acts on the keypress.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

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
        {ai ? (
          // AI on: the instant "See answer" is replaced by Koji, whose reveal is
          // effort-gated (a real attempt + engagement) inside the panel.
          <Button
            size="lg"
            variant="secondary"
            className={LESSON_SECONDARY_CTA_CLASS}
            onPress={() => setKojiOpen(true)}
          >
            Ask Koji
          </Button>
        ) : (
          // AI off: the exact Phase 1 instant "See answer".
          <Button
            size="lg"
            variant="secondary"
            className={LESSON_SECONDARY_CTA_CLASS}
            onPress={seeAnswer}
          >
            See answer
          </Button>
        )}
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

  // Width/alignment are owned by the shell's adaptive callout: short feedback
  // stays a compact bubble above Koji, long KaTeX math falls back to a roomy,
  // left-aligned banner. So we don't cap the width here.
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
      >
        {renderMathText(message)}
      </FeedbackToast>
    ) : undefined;

  return (
    <>
      <LessonShell
        progress={progress}
        onClose={onExit}
        energy={energy}
        correct={phase === "correct"}
        toast={toast}
        footer={footer}
        kojiSwoop={kojiSwoop}
        kojiRef={kojiRef}
        kojiInteractive={ai}
        onAskKoji={ai ? () => setKojiOpen(true) : undefined}
      >
        <StepView
          step={step}
          answer={answer}
          onAnswer={setAnswer}
          phase={phase}
          onSubmit={check}
        />
      </LessonShell>
      {/* AI-only Koji surface (hints / explain / effort-gated reveal). Keyed by
          step so its transcript resets per step. Never mounts with AI off. */}
      {ai ? (
        <KojiPanel
          key={step.id}
          open={kojiOpen}
          onClose={() => setKojiOpen(false)}
          ctx={toolContext}
          step={step}
          phase={phase}
          revealReady={revealReady}
          autoHintToken={autoHintToken}
          onRevealed={applyReveal}
        />
      ) : null}
    </>
  );
}
