import { useNavigate } from "@tanstack/react-router";

import { AppHeader } from "../components/chrome";
import {
  CourseCard,
  CourseMap,
  type CourseMapNode,
  CurrentLessonCard,
  LevelHeader,
} from "../components/course";
import { ProgressBar } from "../components/ui";
import { course, getLesson, lessonOrder, problemCount } from "../content";
import { useStreak } from "../hooks/useStreak";
import { useLearner } from "../lib/learner";

const RECOMMEND_LABEL = {
  start: "Start",
  continue: "Continue",
  review: "Review",
  done: "Done",
} as const;

export function CourseMapScreen() {
  const navigate = useNavigate();
  const { lessonStatus, recommendation } = useLearner();
  const { currentStreak } = useStreak();

  const openLesson = (lessonId: string) =>
    navigate({ to: "/lesson/$lessonId", params: { lessonId } });

  const rec = recommendation();
  const recLesson = getLesson(rec.lessonId);
  const level = course.levels[0];

  const nodes: CourseMapNode[] = level.lessonIds.map((id) => {
    const lesson = getLesson(id);
    const status = lessonStatus(id);
    const state =
      status === "completed"
        ? "completed"
        : status === "locked"
          ? "locked"
          : "active";
    return {
      id,
      label: lesson?.title ?? id,
      state,
      onPress: status === "locked" ? undefined : () => openLesson(id),
    };
  });

  const completed = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;
  const totalLessons = lessonOrder.length;
  const totalExercises = lessonOrder.reduce((sum, id) => {
    const lesson = getLesson(id);
    return sum + (lesson ? problemCount(lesson) : 0);
  }, 0);
  const percent = Math.round((completed / totalLessons) * 100);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[minmax(0,280px)_1fr]">
          <div className="h-fit space-y-4 md:sticky md:top-24">
            <CourseCard
              icon="📐"
              title={course.title}
              description={course.description}
              lessons={totalLessons}
              exercises={totalExercises}
            />
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Your progress
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                {completed}/{totalLessons}
                <span className="ml-1.5 text-sm font-medium text-muted">
                  lessons
                </span>
              </p>
              <ProgressBar
                value={percent}
                aria-label="Chapter progress"
                className="mt-3"
              />
              <p className="mt-3 text-sm font-medium text-muted">
                <span aria-hidden>🔥</span> {currentStreak}-day streak
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-md overflow-x-hidden">
            <CourseMap
              header={<LevelHeader level={1} title={level.title} />}
              nodes={nodes}
              footer={
                recLesson && rec.kind !== "done" ? (
                  <CurrentLessonCard
                    subtitle={RECOMMEND_LABEL[rec.kind]}
                    title={recLesson.title}
                    actionLabel={RECOMMEND_LABEL[rec.kind]}
                    onStart={() => openLesson(rec.lessonId)}
                  />
                ) : (
                  <div className="rounded-2xl border border-success/40 bg-success-soft/40 p-4 text-center text-sm font-semibold text-foreground">
                    <span aria-hidden>🎉</span> Chapter complete! Replay any
                    lesson to sharpen up.
                  </div>
                )
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
