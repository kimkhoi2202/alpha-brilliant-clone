import { useEffect, useState } from "react";
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
  type LessonResult,
} from "../components/lesson";
import { Button } from "../components/ui";
import { getLesson, nextLessonId } from "../content";
import { useStreak } from "../hooks/useStreak";
import { useLearner } from "../lib/learner";

const routeApi = getRouteApi("/lesson/$lessonId");

/** Minimum time the branded lesson loader stays up on launch (ms). */
const LOADER_MIN_MS = 2200;

export function LessonPlayer() {
  const { lessonId } = routeApi.useParams();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);

  // Always show the loader for a beat on each lesson (covers the data load too).
  const [loaderReadyForLessonId, setLoaderReadyForLessonId] = useState<
    string | null
  >(null);
  useEffect(() => {
    const t = setTimeout(
      () => setLoaderReadyForLessonId(lessonId),
      LOADER_MIN_MS,
    );
    return () => clearTimeout(t);
  }, [lessonId]);
  const minElapsed = loaderReadyForLessonId === lessonId;
  const {
    loading,
    resumeIndex,
    startLesson,
    setStepIndex,
    recordStep,
    completeLesson,
  } = useLearner();
  const { currentStreak } = useStreak();
  // Keyed by lessonId so the completion screen auto-resets across lessons
  // (no setState-in-effect needed).
  const [completed, setCompleted] = useState<{
    lessonId: string;
    result: LessonResult;
  } | null>(null);
  const summary =
    completed && completed.lessonId === lessonId ? completed.result : null;

  useEffect(() => {
    if (lesson) void startLesson(lesson.id);
  }, [lesson, startLesson]);

  const goToCourse = () => navigate({ to: "/" });
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

  if (loading || !minElapsed) return <LessonLoader />;

  if (summary) {
    const next = nextLessonId(lesson.id);
    // bg matches the confetti .riv's baked #313131 artboard background so its
    // portrait shape blends in (no visible gray center column).
    return (
      <div className="relative grid min-h-svh place-items-center overflow-hidden bg-[#313131]">
        <ConfettiBurst className="absolute inset-0 z-0" />
        <div className="relative z-10 w-full max-w-md">
          <CelebrationScreen
            art={<CongratsBadge className="size-44" />}
            title="Lesson complete!"
            subtitle={`${summary.correct}/${summary.total} correct`}
            actionLabel={next ? "Next lesson" : "Back to course"}
            onContinue={() => (next ? openLesson(next) : goToCourse())}
            secondaryActionLabel={next ? "Back to course" : undefined}
            onSecondaryAction={goToCourse}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex flex-col items-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Total XP
                </p>
                <p className="text-4xl font-bold text-warning">
                  {summary.xpEarned} ✦
                </p>
              </div>
              <div
                className="flex items-center gap-2 text-sm font-medium text-muted"
                aria-label={`${currentStreak}-day streak`}
              >
                <StreakBolt completed className="h-8 w-6" />
                <span aria-hidden>{currentStreak} day streak</span>
              </div>
            </div>
          </CelebrationScreen>
        </div>
      </div>
    );
  }

  return (
    <LessonRunner
      key={lesson.id}
      lesson={lesson}
      initialStepIndex={resumeIndex(lesson.id)}
      onExit={goToCourse}
      onStepChange={(index) => void setStepIndex(lesson.id, index)}
      onStepGraded={(result) =>
        void recordStep(lesson.id, {
          stepId: result.stepId,
          attempts: result.attempts,
          correct: result.correct,
          hintsUsed: result.hintsUsed,
          firstTryCorrect: result.firstTry,
        })
      }
      onComplete={(result) => {
        void completeLesson(lesson.id, result.xpEarned);
        setCompleted({ lessonId: lesson.id, result });
      }}
    />
  );
}
