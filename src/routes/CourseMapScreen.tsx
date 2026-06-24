import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { AppHeader } from "../components/chrome";
import {
  CourseCard,
  CourseMap,
  type CourseMapNode,
  LessonProgressMedallion,
  LevelHeader,
  PythagorasArt,
} from "../components/course";
import { Button } from "../components/ui";
import { course, getLesson, lessonOrder, problemCount } from "../content";
import { requestLessonIntro } from "../lib/lesson-transition";
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

  const openLesson = (lessonId: string) => {
    // Launching from the map plays the branded intro animation (a transition).
    requestLessonIntro(lessonId);
    void navigate({ to: "/lesson/$lessonId", params: { lessonId } });
  };

  const rec = recommendation();
  const courseAllCompleted = lessonOrder.every(
    (id) => lessonStatus(id) === "completed",
  );
  // The active "you are here" Koji marker only exists once progress has loaded.
  // Before that, progress is empty so every lesson reads "available" and the
  // recommendation falls back to lesson 1, marking it active would fire Koji on
  // the wrong node, and the marker would linger when the real one appears.
  const currentId = loading ? null : rec.lessonId;
  // Selection follows the recommendation until the learner clicks another node
  // (null = "follow the current lesson"), so the glow lands on the right node
  // after progress loads rather than sticking to the initial guess.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedId ?? rec.lessonId;

  // Build one level's meandering puck list. No lesson is ever locked: completed
  // lessons show their state, exactly one node (the current lesson) carries the
  // Koji marker, the rest are plain pucks, and the selected node glows.
  const buildNodes = (lessonIds: string[]): CourseMapNode[] =>
    lessonIds.map((id) => {
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
      <main className="mx-auto max-w-5xl px-4 pt-10 pb-28 sm:px-6 lg:pt-12 lg:pb-32">
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

          <div className="mx-auto w-full max-w-md space-y-12 overflow-x-hidden">
            {course.levels.map((lvl, idx) => (
              <CourseMap
                key={lvl.id}
                header={
                  <LevelHeader
                    level={idx + 1}
                    title={lvl.title}
                    objectives={lvl.objectives}
                    allCompleted={courseAllCompleted}
                    onReset={() => void resetProgress()}
                  />
                }
                nodes={buildNodes(lvl.lessonIds)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Floating action: just the CTA for the selected lesson, pinned to the
          bottom of the screen so it hovers above the map (and any content
          beneath it) rather than sitting in a card. The overlay mirrors the
          main container + grid (max width, padding, columns) so the button
          stays centered on the lessons column at every width, collapsing to
          the single content column on mobile. */}
      {selectedLesson ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 px-4 sm:px-6">
          <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
            <div aria-hidden className="hidden md:block" />
            <div className="flex justify-center">
              <Button
                variant={selectedVariant}
                size="lg"
                className="pointer-events-auto h-12 min-w-52 px-8 text-base shadow-[0_14px_40px_rgba(0,0,0,0.55)]"
                onPress={() => openLesson(activeSelectedId)}
              >
                {selectedActionLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
