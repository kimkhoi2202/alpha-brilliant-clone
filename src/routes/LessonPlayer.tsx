import { useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { CelebrationScreen } from "../components/celebration";
import { LessonRunner, type LessonResult } from "../components/lesson";
import { Button } from "../components/ui";
import { getLesson, nextLessonId } from "../content";
import { useStreak } from "../hooks/useStreak";
import { useLearner } from "../lib/learner";

const routeApi = getRouteApi("/lesson/$lessonId");

function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

export function LessonPlayer() {
  const { lessonId } = routeApi.useParams();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);
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

  if (loading) return <Splash />;

  if (summary) {
    const next = nextLessonId(lesson.id);
    return (
      <div className="grid min-h-svh place-items-center bg-background">
        <div className="w-full max-w-md">
          <CelebrationScreen
            art="🏆"
            title="Lesson complete!"
            subtitle={`${summary.correct}/${summary.total} correct`}
            actionLabel={next ? "Next lesson" : "Back to course"}
            onContinue={() => (next ? openLesson(next) : goToCourse())}
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
              <p className="text-sm font-medium text-muted">
                <span aria-hidden>🔥</span> {currentStreak}-day streak
              </p>
              {next ? (
                <button
                  type="button"
                  onClick={goToCourse}
                  className="text-sm text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  Back to course
                </button>
              ) : null}
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
