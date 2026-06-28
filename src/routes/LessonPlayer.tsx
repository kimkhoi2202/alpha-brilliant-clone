import { useCallback, useEffect, useRef, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import {
  CelebrationScreen,
  ConfettiBurst,
  CongratsBadge,
} from "../components/celebration";
import { StreakBolt } from "../components/chrome";
import {
  LessonLoader,
  LessonRunner,
  LessonSkeleton,
  type LessonResult,
} from "../components/lesson";
import { RecallWarmup } from "../components/review";
import { Button } from "../components/ui";
import {
  getLesson,
  getSkill,
  nextLessonId,
  pickReviewQuestions,
  priorSkillsForLesson,
  type ProblemStep,
  type SkillId,
} from "../content";
import { useStreak } from "../hooks/useStreak";
import { today } from "../lib/date";
import { clearLessonIntro, peekLessonIntro } from "../lib/lesson-transition";
import { useLearner, type SkillMastery } from "../lib/learner";

const routeApi = getRouteApi("/lesson/$lessonId");

/** How long the branded map → lesson transition animation plays (ms). */
const INTRO_DURATION_MS = 2200;

export function LessonPlayer() {
  const { lessonId } = routeApi.useParams();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);

  // The branded Rive animation is a *transition*, shown only when launching a
  // lesson from the course map (which arms `requestLessonIntro`). Decide once per
  // lesson from a pure read of that one-shot flag (so it never pops up mid-lesson
  // or on a refresh, genuine loading uses a skeleton instead).
  const [intro, setIntro] = useState<{ lessonId: string; play: boolean }>(
    () => ({ lessonId, play: peekLessonIntro(lessonId) }),
  );
  if (intro.lessonId !== lessonId) {
    setIntro({ lessonId, play: peekLessonIntro(lessonId) });
  }
  const playIntro = intro.play;

  // Time-box the transition; consume the one-shot flag so it can't replay on a
  // refresh, "Next lesson", or any in-lesson re-render.
  const [introElapsedFor, setIntroElapsedFor] = useState<string | null>(null);
  useEffect(() => {
    clearLessonIntro();
    const t = setTimeout(() => setIntroElapsedFor(lessonId), INTRO_DURATION_MS);
    return () => clearTimeout(t);
  }, [lessonId]);
  const introDone = introElapsedFor === lessonId;
  const {
    loading,
    resumeIndex,
    lessonStatus,
    skillMastery,
    startLesson,
    setStepIndex,
    recordStep,
    completeLesson,
  } = useLearner();

  // Opening recall warm-up (Phase 3, SPOV 8): show once per fresh lesson entry,
  // keyed by lesson id so it resets when moving to the next lesson.
  const [warmupDoneFor, setWarmupDoneFor] = useState<string | null>(null);
  const finishWarmup = useCallback(
    () => setWarmupDoneFor(lessonId),
    [lessonId],
  );
  const { currentStreak, lastActiveDate } = useStreak();
  // Keyed by lessonId so the completion screen auto-resets across lessons
  // (no setState-in-effect needed).
  const [completed, setCompleted] = useState<{
    lessonId: string;
    result: LessonResult;
    /** Whether this run was the day's first activity (so it earned the streak). */
    earnedStreak: boolean;
  } | null>(null);
  const summary =
    completed && completed.lessonId === lessonId ? completed.result : null;
  const earnedStreakToday =
    completed?.lessonId === lessonId ? completed.earnedStreak : false;

  useEffect(() => {
    if (lesson) void startLesson(lesson.id);
  }, [lesson, startLesson]);

  // Celebrate the streak only on the day's *first* activity. `recordStep` marks
  // the day active on the first answer, so by completion `lastActiveDate` is
  // always today: instead we snapshot, once per lesson at its start (in a ref,
  // read later from the completion handler), whether the streak was already
  // counted today *before* this run began.
  const alreadyActiveTodayRef = useRef<{
    lessonId: string;
    value: boolean;
  } | null>(null);
  useEffect(() => {
    if (loading) return;
    if (alreadyActiveTodayRef.current?.lessonId === lessonId) return;
    alreadyActiveTodayRef.current = {
      lessonId,
      value: lastActiveDate === today(),
    };
  }, [loading, lessonId, lastActiveDate]);

  const goToCourse = () => navigate({ to: "/courses" });
  const openLesson = (id: string) =>
    navigate({ to: "/lesson/$lessonId", params: { lessonId: id } });

  if (!lesson) {
    return (
      <div className="grid min-h-svh place-items-center bg-background px-4 text-center text-foreground">
        <div className="space-y-4">
          <p className="text-lg font-semibold">Lesson not found</p>
          <Button onPress={goToCourse}>Back to course</Button>
        </div>
      </div>
    );
  }

  // Map → lesson: play the transition animation (time-boxed).
  if (playIntro && !introDone) return <LessonLoader />;
  // Genuinely fetching data (e.g. a direct load / refresh on a lesson URL).
  if (loading) return <LessonSkeleton />;

  if (summary) {
    const next = nextLessonId(lesson.id);
    // bg matches the confetti .riv's baked #313131 artboard background so its
    // portrait shape blends in (no visible gray center column).
    return (
      <div className="relative grid min-h-svh place-items-center overflow-hidden bg-[#313131]">
        <ConfettiBurst className="absolute inset-0 z-0" />
        <div className="relative z-10 w-full max-w-lg">
          <CelebrationScreen
            size="lg"
            art={<CongratsBadge className="size-52" />}
            title={
              lesson.id === "level-review"
                ? "Chapter complete!"
                : "Lesson complete!"
            }
            actionLabel={next ? "Next lesson" : "Back to course"}
            onContinue={() => (next ? openLesson(next) : goToCourse())}
            secondaryActionLabel={next ? "Back to course" : undefined}
            onSecondaryAction={goToCourse}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center">
                <p className="text-sm font-bold uppercase tracking-wider text-muted">
                  Total XP
                </p>
                <p className="text-[2.6rem] font-bold leading-none text-warning">
                  {summary.xpEarned} ✦
                </p>
              </div>
              {earnedStreakToday ? (
                <div
                  className="flex items-center gap-2 text-base font-medium text-muted"
                  aria-label={`${currentStreak}-day streak`}
                >
                  <StreakBolt completed className="h-9 w-7" />
                  <span aria-hidden>{currentStreak} day streak</span>
                </div>
              ) : null}
            </div>
          </CelebrationScreen>
        </div>
      </div>
    );
  }

  // A fresh, not-yet-completed teaching lesson gets one opening recall question
  // on a previously-learned prerequisite skill (skippable). Cheap, deterministic
  // existence check here; the gate composes the actual question once on mount.
  const hasWarmup = priorSkillsForLesson(lesson.id).some(
    (id) => skillMastery(id) !== null,
  );
  const showWarmup =
    warmupDoneFor !== lesson.id &&
    lesson.steps.length > 0 &&
    resumeIndex(lesson.id) === 0 &&
    lessonStatus(lesson.id) !== "completed" &&
    hasWarmup;
  if (showWarmup) {
    return <LessonWarmupGate lessonId={lesson.id} onDone={finishWarmup} />;
  }

  return (
    <LessonRunner
      key={lesson.id}
      lesson={lesson}
      initialStepIndex={resumeIndex(lesson.id)}
      isFinalLesson={nextLessonId(lesson.id) === null}
      swoopEntrance={playIntro}
      onExit={goToCourse}
      onStepChange={(index) => void setStepIndex(lesson.id, index)}
      onStepGraded={(result) =>
        void recordStep(lesson.id, {
          stepId: result.stepId,
          skill: result.skill,
          attempts: result.attempts,
          correct: result.correct,
          hintsUsed: result.hintsUsed,
          firstTryCorrect: result.firstTry,
        })
      }
      onComplete={(result) => {
        void completeLesson(lesson.id, result.xpEarned);
        const snap = alreadyActiveTodayRef.current;
        const earnedStreak = snap?.lessonId === lesson.id ? !snap.value : true;
        setCompleted({ lessonId: lesson.id, result, earnedStreak });
      }}
    />
  );
}

/** Compose the warm-up: one generative, scaffold-dropped recall question on the
 *  most recently learned prerequisite skill, or null if there's none yet. */
function buildWarmup(
  lessonId: string,
  skillMastery: (id: SkillId) => SkillMastery | null,
): { skill: SkillId; question: ProblemStep } | null {
  const priors = priorSkillsForLesson(lessonId).filter(
    (id) => skillMastery(id) !== null,
  );
  if (priors.length === 0) return null;
  const skill = priors[priors.length - 1];
  const question = pickReviewQuestions(skill, 1, { dropScaffold: true })[0];
  return question ? { skill, question } : null;
}

/**
 * Mounts the opening recall warm-up. Composes the question exactly once (on
 * mount, after the learner state has loaded), records the outcome as a review,
 * and then proceeds into the lesson. Auto-advances if there's nothing to recall.
 */
function LessonWarmupGate({
  lessonId,
  onDone,
}: {
  lessonId: string;
  onDone: () => void;
}) {
  const { skillMastery, recordReview } = useLearner();
  const [warmup] = useState(() => buildWarmup(lessonId, skillMastery));

  useEffect(() => {
    if (!warmup) onDone();
  }, [warmup, onDone]);

  if (!warmup) return null;
  const label = getSkill(warmup.skill)?.label ?? warmup.skill;
  return (
    <RecallWarmup
      question={warmup.question}
      skillLabel={label}
      onComplete={(correct) => {
        void recordReview(warmup.skill, {
          correct,
          firstTryCorrect: correct,
        });
        onDone();
      }}
      onSkip={onDone}
    />
  );
}
