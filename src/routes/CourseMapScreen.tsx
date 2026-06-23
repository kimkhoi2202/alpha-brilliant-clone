import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { AppHeader } from "../components/chrome";
import {
  CourseCard,
  CourseMap,
  type CourseMapNode,
  CurrentLessonCard,
  LessonProgressMedallion,
  LevelHeader,
  PythagorasArt,
} from "../components/course";
import { course, getLesson, lessonOrder, problemCount } from "../content";
import { useLearner } from "../lib/learner";

const RECOMMEND_LABEL = {
  start: "Start",
  continue: "Continue",
  review: "Review",
  done: "Done",
} as const;

export function CourseMapScreen() {
  const navigate = useNavigate();
  const { lessonStatus, recommendation, loading, resetProgress } = useLearner();

  const openLesson = (lessonId: string) =>
    navigate({ to: "/lesson/$lessonId", params: { lessonId } });

  const rec = recommendation();
  const level = course.levels[0];
  const allCompleted = level.lessonIds.every(
    (id) => lessonStatus(id) === "completed",
  );
  // The active "you are here" Koji marker only exists once progress has loaded.
  // Before that, progress is empty so every lesson reads "available" and the
  // recommendation falls back to lesson 1 — marking it active would fire Koji on
  // the wrong node, and the marker would linger when the real one appears.
  const currentId = loading ? null : rec.lessonId;
  // Selection follows the recommendation until the learner clicks another node
  // (null = "follow the current lesson"), so the glow lands on the right node
  // after progress loads rather than sticking to the initial guess.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedId ?? rec.lessonId;

  // No lesson is ever locked — completed lessons show their state, exactly one
  // node (the current lesson) carries the Koji marker, the rest are plain pucks,
  // and the selected node carries the glow ring.
  const nodes: CourseMapNode[] = level.lessonIds.map((id) => {
    const lesson = getLesson(id);
    const state: CourseMapNode["state"] =
      lessonStatus(id) === "completed"
        ? "completed"
        : id === currentId
          ? "active"
          : "available";
    return {
      id,
      label: lesson?.title ?? id,
      state,
      selected: id === activeSelectedId,
      onPress: () => setSelectedId(id),
    };
  });

  const selectedLesson = getLesson(activeSelectedId);
  const selectedIsCompleted = lessonStatus(activeSelectedId) === "completed";
  const selectedIsCurrent =
    activeSelectedId === rec.lessonId && rec.kind !== "done";
  const selectedActionLabel = selectedIsCompleted
    ? "Review"
    : selectedIsCurrent
      ? RECOMMEND_LABEL[rec.kind]
      : "Jump here";
  // Accent (blue) is reserved for the recommended *next step* (Start/Continue).
  // Reviewing an already-completed lesson is always a secondary action, so every
  // "Review" button looks the same regardless of which one the recommender favors.
  const selectedVariant =
    selectedIsCurrent && !selectedIsCompleted ? "accent" : "secondary";

  const completed = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;
  const totalLessons = lessonOrder.length;
  const totalExercises = lessonOrder.reduce((sum, id) => {
    const lesson = getLesson(id);
    return sum + (lesson ? problemCount(lesson) : 0);
  }, 0);
  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
          <div className="h-fit space-y-5 md:sticky md:top-24">
            <CourseCard
              art={<PythagorasArt />}
              title={course.title}
              description={course.description}
              lessons={totalLessons}
              exercises={totalExercises}
            />
            <div className="rounded-2xl border-2 border-border bg-background p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                Your progress
              </p>
              <LessonProgressMedallion
                current={completed}
                total={totalLessons}
                className="mt-4"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-md overflow-x-hidden">
            <CourseMap
              header={
                <LevelHeader
                  level={1}
                  title={level.title}
                  objectives={level.objectives}
                  allCompleted={allCompleted}
                  onReset={() => void resetProgress()}
                />
              }
              nodes={nodes}
              footer={
                selectedLesson ? (
                  <CurrentLessonCard
                    title={selectedLesson.title}
                    actionLabel={selectedActionLabel}
                    variant={selectedVariant}
                    onStart={() => openLesson(activeSelectedId)}
                  />
                ) : null
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
