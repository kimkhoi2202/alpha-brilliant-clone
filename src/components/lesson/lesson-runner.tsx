import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  describeAnswer,
  parseCanvasValue,
  type CanvasComponentHandle,
  type KojiReactions,
  type LessonCanvas,
  type RevealAllowed,
} from "../../lib/ai/tools";
import {
  useEngagement,
  useToolContext,
} from "../../lib/ai/tools/use-tool-context";
import { useKojiConversation } from "../../lib/ai/use-koji-conversation";
// DEV-only `[koji]` logger (lives in the voice session module; the barrel doesn't
// re-export it). Used to trace the proactive-coach trigger — fired vs skipped —
// alongside the realtime session's own `[koji]` logs. Tree-shaken from prod.
import { klog } from "../../lib/ai/voice/session";
import type { StepRecord } from "../../lib/learner";
import { Button } from "../ui";
import { renderMathText } from "../ui/math";
import { FooterCtaBar } from "../chrome";
import type { KojiHandle } from "./ask-koji";
import { ExitLessonDialog } from "./exit-lesson-dialog";
import { FeedbackToast } from "./feedback-toast";
import { KojiPanel, type MascotReactionSignal } from "./koji";
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

/**
 * Success reactions fired on the IN-PANEL Koji mascot on a first-try-correct
 * answer (mirrors the lesson mascot's celebration). Constrained to the two beats
 * that read well in the compact panel — the same set the mascot's idle loop uses.
 */
const PANEL_SUCCESS_REACTIONS = ["successSmall", "successMedium"] as const;

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
  // The furthest step the learner has actually reached. Forward navigation is
  // gated to this frontier (they can never skip ahead to an unseen step), and
  // both progress and resume track it so reviewing earlier steps rewinds
  // neither. Seeded to the same resume position as `stepIndex`.
  const [furthestIndex, setFurthestIndex] = useState(clampedStart);
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
  // Progress reflects actual completion (the furthest step reached), so stepping
  // back to review earlier steps never rewinds the bar. `furthestIndex` is always
  // >= `stepIndex` by construction; the Math.max is just belt-and-suspenders.
  const progress = Math.round((Math.max(stepIndex, furthestIndex) / total) * 100);
  const canGoBack = stepIndex > 0;
  const canGoForward = stepIndex < furthestIndex;

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function goForward() {
    // Capped at the frontier: forward only re-advances through steps the learner
    // has already reached, never ahead into an unseen / unanswered step.
    setStepIndex((i) => Math.min(i + 1, furthestIndex));
  }
  // Jump straight to a specific ALREADY-REACHED step — wired to the clickable
  // "answer" bubbles in Koji's chat so tapping a recorded try returns the learner
  // to that exact step. Capped at the frontier (same gate as forward nav, so it
  // can never skip ahead to an unseen step); StepScreen restores that step's saved
  // answer + verdict on the change, exactly like the back/forward chevrons.
  function goToStep(index: number) {
    setStepIndex(Math.min(Math.max(index, 0), furthestIndex));
  }
  // The path's very last step: Koji waves goodbye on its completion. With a
  // quiz, that goodbye moves to the end of the quiz (the new final beat), so the
  // last *step* no longer waves.
  const isFinalStep = isFinalLesson && stepIndex === total - 1 && !hasQuiz;

  function advance(result: StepResult | null) {
    // Count each step exactly once. XP, the correct tally, and `onStepGraded`
    // fire only on the FIRST completion of a step — i.e. when completing the
    // frontier step (stepIndex === furthestIndex). Re-advancing through an
    // already-completed step (the forward chevron, or the "Continue" CTA on a
    // restored past step) must not re-award XP, re-count, or re-fire grading.
    const isFirstCompletion = stepIndex === furthestIndex;
    if (result && isFirstCompletion) {
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
    // The frontier only ever moves forward. Resume persistence (`onStepChange`)
    // tracks it — not review navigation — so going back to revisit a step never
    // rewinds the saved resume position. Both fire only when we push past the
    // previous furthest step.
    if (next > furthestIndex) {
      setFurthestIndex(next);
      onStepChange?.(next);
    }
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
        lessonTitle={lesson.title}
        step={step}
        stepIndex={stepIndex}
        progress={progress}
        energy={energy}
        isFinalStep={isFinalStep}
        kojiSwoop={swoopEntrance}
        kojiRef={kojiRef}
        onExit={() => setConfirmExit(true)}
        onAdvance={advance}
        onBack={goBack}
        onForward={goForward}
        onGoToStep={goToStep}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
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
  /** Human-readable lesson title (stored with + shown for saved conversations). */
  lessonTitle: string;
  step: Step;
  /** This step's index in the lesson (stamped onto recorded answer bubbles). */
  stepIndex: number;
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
  /** Step back to review an already-completed step (top-bar back chevron). */
  onBack: () => void;
  /** Step forward through already-reached steps (top-bar forward chevron). */
  onForward: () => void;
  /** Jump to a specific already-reached step (clicking a recorded answer bubble). */
  onGoToStep: (index: number) => void;
  /** Whether an earlier step exists to go back to. */
  canGoBack: boolean;
  /** Whether an already-reached forward step exists to advance to. */
  canGoForward: boolean;
}

/**
 * A step's per-step state, stashed by id so revisiting it shows a *review* (the
 * learner's previous answer + graded verdict) instead of a fresh question.
 */
interface SavedStepState {
  answer: AnswerValue | null;
  phase: StepPhase;
  attempts: number;
  hintsUsed: boolean;
  message: string;
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
  lessonTitle,
  step,
  stepIndex,
  progress,
  energy,
  isFinalStep,
  kojiSwoop,
  kojiRef,
  onExit,
  onAdvance,
  onBack,
  onForward,
  onGoToStep,
  canGoBack,
  canGoForward,
}: StepScreenProps) {
  // Phase 2 Koji is entirely flag-gated: with AI off, none of the interactive
  // surface below renders and the step behaves byte-for-byte like Phase 1.
  const ai = aiEnabled();

  // Lesson-scoped conversation store: one persisted conversation per lesson that
  // survives the panel closing + step changes. AI-off-safe (no Firestore calls).
  const conversation = useKojiConversation(lessonId, lessonTitle);

  // Per-step state stash, keyed by step id. `StepScreen` is intentionally NOT
  // keyed by step id (so Koji's Rive instance persists), so this survives step
  // changes. Navigating back restores a step's saved answer + verdict, and
  // navigating forward restores it too — so moving through already-seen steps is
  // a review, never a redo. Kept in state (not a ref) and updated via the
  // immutable updater below: a render-phase ref mutation is impure and makes the
  // React Compiler bail on the whole component, but a setState during render is
  // the same supported pattern as the per-step resets just below.
  const [savedStates, setSavedStates] = useState<Map<string, SavedStepState>>(
    () => new Map(),
  );
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
  // Bumped to auto-request a hint after the 2nd wrong attempt (offer, once). The
  // hint UI is currently hidden, so this is dormant; the proactive coach below is
  // what the auto-offer now actually drives.
  const [autoHintToken, setAutoHintToken] = useState(0);
  // Proactive-coaching trigger: flips true on the once-per-step auto-offer and is
  // cleared by the Koji surface (`onCoachHandled`) the instant it fires the one
  // coach turn. A cleared flag is what stops a surface remount (new chat / resume)
  // from replaying a stale offer. Reset on step change too (belt-and-suspenders).
  const [coachPending, setCoachPending] = useState(false);
  // Latches the one-time auto-offer so it fires once per step (state, not a ref,
  // so it resets cleanly during the step-change render below).
  const [autoOffered, setAutoOffered] = useState(false);
  // Outcome reaction for the IN-PANEL Koji mascot: `check()` bumps the nonce on
  // every grade so the mascot mirrors the lesson mascot (success / miss). It
  // persists across steps (StepScreen isn't remounted per step); the nonce is
  // monotonic, so a new grade always re-fires and a panel re-open never replays
  // the last one (the mascot treats its mount-time nonce as a baseline).
  const [mascotReaction, setMascotReaction] = useState<MascotReactionSignal>();
  // The per-step "engaged Koji?" signal that (with a real attempt) unlocks reveal.
  const engagement = useEngagement();

  // Stable: the Koji surface calls this once it has fired the proactive coach turn
  // for an offer, so the flag is consumed exactly once (see `coachPending`).
  const handleCoachHandled = useCallback(() => setCoachPending(false), []);

  // The mounted interaction's canvas handle (published by the component via its
  // `canvasRef`). The assembled `LessonCanvas` below delegates visual ops here;
  // it's null until/unless the interaction implements the handle, in which case
  // visual ops no-op but `prefillAnswer` (host-owned) still works.
  const interactionHandleRef = useRef<CanvasComponentHandle | null>(null);

  // Reset per-step state when advancing to a new step. This replaces the
  // previous `key`-based remount (dropped so the shell, and Koji's persistent
  // Rive instance, survive step changes). Setting state during render makes
  // React immediately re-render with fresh state before committing, so there's
  // no flash of the prior step's answer. We don't early-return (that would skip
  // the hooks below); the discarded render is harmless: `isAnswerProvided`
  // guards on `answer.kind`, so a stale answer just reads as "not provided".
  if (renderedStepId !== step.id) {
    // 1) SAVE the OUTGOING step's state first. `answer`, `phase`, `attempts`,
    //    `hintsUsed`, and `message` still hold the prior step's values here, so
    //    stashing them lets a later revisit show the learner's previous answer +
    //    graded verdict (a review) rather than a blank question. Immutable update
    //    (a fresh Map) so nothing is mutated during render.
    setSavedStates((prev) => {
      const next = new Map(prev);
      next.set(renderedStepId, { answer, phase, attempts, hintsUsed, message });
      return next;
    });

    setRenderedStepId(step.id);

    // 2) RESTORE the incoming step if we've seen it before; otherwise reset it
    //    fresh (the original behavior). Concept steps have no answer, so theirs
    //    is null either way — save/restore is a no-op for the answer there. We
    //    read the pre-update `savedStates` here: the new step's own prior save
    //    (if any) lives there; the update above only stashes the outgoing step.
    const saved = savedStates.get(step.id);
    if (saved) {
      setAnswer(saved.answer);
      setPhase(saved.phase);
      setAttempts(saved.attempts);
      setHintsUsed(saved.hintsUsed);
      setMessage(saved.message);
    } else {
      setAnswer(
        step.kind === "problem" ? defaultAnswer(step.interaction) : null,
      );
      setPhase("answering");
      setAttempts(0);
      setHintsUsed(false);
      setMessage("");
    }
    // Reset Koji's per-step state regardless of fresh-vs-restored: clear the
    // auto-hint offer + the reveal engagement gate so a revisited step never
    // auto-pops a hint. We deliberately do NOT close the panel here — Koji
    // persists across steps (the conversation is per-lesson), so it stays open as
    // the learner navigates; its grounding + hints follow the new step via props.
    // All pure setState (the engagement signal is state-backed), so this runs
    // safely as a render-phase adjustment alongside the resets above.
    setAutoHintToken(0);
    setAutoOffered(false);
    setCoachPending(false);
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

  // Assemble the `LessonCanvas` Koji's canvas tools drive: visual ops delegate
  // to the mounted interaction's handle (no-op until a component publishes one),
  // and `prefillAnswer` parses the string for this interaction kind and sets the
  // in-progress answer — only while answering, and NEVER submitting (the learner
  // still presses Check). Memoized on [step, phase]; `setAnswer` is stable.
  const lessonCanvas = useMemo<LessonCanvas>(
    () => ({
      listTargets: () => interactionHandleRef.current?.listTargets() ?? [],
      highlight: (targetId, opts) =>
        interactionHandleRef.current?.highlight(targetId, opts),
      label: (targetId, text) =>
        interactionHandleRef.current?.label(targetId, text),
      point: (targetId) => interactionHandleRef.current?.point(targetId),
      clear: () => interactionHandleRef.current?.clear(),
      prefillAnswer: (value) => {
        if (step.kind !== "problem" || phase !== "answering") return;
        const parsed = parseCanvasValue(step.interaction, value);
        if (parsed) setAnswer(parsed);
      },
    }),
    [step, phase],
  );

  // Clear Koji's annotations when the step changes. Consecutive steps can reuse
  // the same interaction component (e.g. pick-side → pick-sides), so the handle
  // persists; this stops one step's highlights from lingering onto the next.
  // Layout-effect so it lands before paint (no flash). No-op when no handle.
  // Also clear on a NEW CHAT (or any active-conversation switch): a fresh
  // conversation starts with a clean figure, so Koji's highlights / labels /
  // points from the prior chat don't linger on the interaction.
  useLayoutEffect(() => {
    interactionHandleRef.current?.clear();
  }, [step.id, conversation.active.conversationId]);

  // The single live `ToolContext` every Koji tool runs against.
  const toolContext = useToolContext({
    lessonId,
    step,
    answer,
    record: liveRecord,
    koji: kojiReactions,
    // Null when AI is off or on a concept step, so canvas tools no-op safely.
    canvas: ai && step.kind === "problem" ? lessonCanvas : null,
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
    const correct = evaluation.status === "correct";

    // Universal answer record (P1): on EVERY Check — correct AND wrong — append a
    // special "answer" bubble (the learner's concise submission + verdict) to
    // Koji's active conversation, so the full record of tries persists to history
    // and is clickable back to this step. AI-gated; the conversation store no-ops
    // with AI off and seeds/creates a conversation even if Koji has never been
    // opened. Reuses `describeAnswer` (the readState renderer) so the rendering
    // is concise and universal across every interaction kind.
    if (ai) {
      conversation.appendAnswer(
        describeAnswer(step.interaction, answer),
        correct,
        stepIndex,
      );
    }

    if (correct) {
      setPhase("correct");
      // Universal clear-on-correct: the instant ANY interaction grades correct,
      // wipe Koji's canvas annotations (highlights / labels / points / pulses) so
      // nothing lingers over the correct state. This is the single shared outcome
      // handler every interaction kind flows through, so it covers them all (this
      // resets the mounted component's annotation state via its handle's clear()).
      // Wrong answers (the else branch) deliberately KEEP annotations so Koji can
      // keep coaching against them.
      interactionHandleRef.current?.clear();
      // Koji reaction: a reassuring beat after a miss, otherwise a random
      // success celebration. (The final-step goodbye wave fires separately, once
      // that step's Continue appears.)
      if (attempts > 0) kojiRef.current?.correctAfterIncorrect();
      else kojiRef.current?.success();
      // Mirror that beat on the IN-PANEL Koji mascot: `correctAfterIncorrect`
      // after a miss, otherwise a success celebration. Bump the nonce + stamp `ts`
      // so the mascot fires it exactly once (it dedupes by nonce and gates a
      // mount-time reaction on freshness).
      const reaction =
        attempts > 0
          ? "correctAfterIncorrect"
          : PANEL_SUCCESS_REACTIONS[
              Math.floor(Math.random() * PANEL_SUCCESS_REACTIONS.length)
            ];
      setMascotReaction((prev) => ({
        name: reaction,
        nonce: (prev?.nonce ?? 0) + 1,
        ts: Date.now(),
      }));
    } else {
      setPhase("wrong");
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      // FIRST wrong attempt → Koji takes over (P2), ONCE per step: auto-open the
      // panel and fire a PROACTIVE, personalized Socratic coach turn into the Koji
      // chat (he jumps in unprompted, reads the learner's live wrong answer,
      // highlights the relevant figure part, and gives one guiding question —
      // never the answer). The static wrong feedback + "Ask Koji" button are
      // removed on wrong, so Koji is now the help path. Latched by `autoOffered`
      // so it fires exactly once per step; AI-gated, so AI-off is unaffected. The
      // realtime send path (single-flight connect + one response-per-turn) makes
      // the turn dup-safe. `nextAttempts >= 1` is the 1st-wrong retarget (this was
      // previously gated to the 2nd wrong, with the coach trigger commented out).
      if (ai && nextAttempts >= 1) {
        if (!autoOffered) {
          setAutoOffered(true);
          setKojiOpen(true);
          // Dormant hint auto-offer token (HintCards is hidden), kept wired.
          setAutoHintToken((t) => t + 1);
          // Re-enabled proactive coach: the surface fires exactly one Socratic,
          // state-aware, highlighting nudge via the safe single-flight path.
          setCoachPending(true);
          klog("proactive coach: offer (1st wrong)", {
            attempts: nextAttempts,
            stepId: step.id,
          });
        } else {
          klog("proactive coach: skipped-because-already-offered", {
            attempts: nextAttempts,
            stepId: step.id,
          });
        }
      }
      kojiRef.current?.incorrect();
      // Mirror the miss on the IN-PANEL Koji mascot (the same `incorrect` trigger
      // the lesson mascot fires). The `ts` stamp lets the mascot react even on the
      // FIRST wrong — which auto-opens the panel and mounts the mascot fresh — by
      // firing a still-RECENT reaction on mount, while never replaying a stale one
      // when the panel is merely re-opened later.
      setMascotReaction((prev) => ({
        name: "incorrect",
        nonce: (prev?.nonce ?? 0) + 1,
        ts: Date.now(),
      }));
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
      // Koji is likewise non-modal (role="region", not a dialog), so it never
      // matches this query and the lesson stays Enter-drivable while it's open.
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
      // Inside the calculator OR the Koji panel: each non-modal floating panel
      // owns its own keys (calc: Enter = compute; Koji: composer send, hint flip,
      // history, close), so let the keypress land there and never drive the lesson
      // from a key typed while a panel holds focus. Once the user clicks back on
      // the lesson, focus leaves the panel and Enter drives the lesson again.
      if (
        source instanceof Element &&
        source.closest("[data-lesson-calculator], [data-lesson-koji]")
      ) {
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
        {/* AI on: the "Ask Koji" button is removed — Koji has already taken over
            (auto-opened + proactively coaching), so the only action is "Try
            again". AI off: keep the exact Phase 1 instant "See answer". */}
        {ai ? null : (
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
  //
  // The static WRONG callout is intentionally SUPPRESSED (P2): on a wrong answer
  // Koji takes over (auto-opens + proactively coaches), so the old yellow
  // "That's incorrect" box would be redundant noise. The CORRECT callout — and
  // its `panelOpen` reposition — stays, and the revealed callout (worked answer)
  // is unaffected.
  const toast =
    phase !== "answering" && phase !== "wrong" && message ? (
      <FeedbackToast status={phase === "correct" ? "correct" : "revealed"}>
        {renderMathText(message)}
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
      kojiSwoop={kojiSwoop}
      kojiRef={kojiRef}
      kojiInteractive={ai}
      // Drives the feedback callout's position: open → it centers in the content
      // column (clear of the left-docked panel); closed → bottom-left over Koji.
      panelOpen={ai && kojiOpen}
      onAskKoji={ai ? () => setKojiOpen(true) : undefined}
      onBack={onBack}
      onForward={onForward}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      koji={
        // AI-only Koji surface (hints / explain / effort-gated reveal), mounted
        // INSIDE the lesson frame so it lines up with the border. NOT keyed by
        // step — Koji persists across steps (the conversation is per-lesson), so
        // the panel stays open and the session continues as the learner advances;
        // its grounding + hints follow the current step via props (the hint cards
        // reset themselves per step via their own key). Never mounts with AI off.
        ai ? (
          <KojiPanel
            open={kojiOpen}
            onClose={() => setKojiOpen(false)}
            ctx={toolContext}
            step={step}
            phase={phase}
            revealReady={revealReady}
            autoHintToken={autoHintToken}
            coachPending={coachPending}
            onCoachHandled={handleCoachHandled}
            onRevealed={applyReveal}
            conversation={conversation}
            onGoToStep={onGoToStep}
            reactionSignal={mascotReaction}
          />
        ) : null
      }
    >
      <StepView
        step={step}
        answer={answer}
        onAnswer={setAnswer}
        phase={phase}
        onSubmit={check}
        canvasRef={ai ? interactionHandleRef : undefined}
      />
    </LessonShell>
  );
}
