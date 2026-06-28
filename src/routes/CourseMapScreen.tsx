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
import { PracticePromoCard } from "../components/practice";
import { Button } from "../components/ui";
import { course, getLesson, lessonOrder, problemCount } from "../content";
import { aiEnabled } from "../lib/ai/flag";
import { requestLessonIntro } from "../lib/lesson-transition";
import { useLearner } from "../lib/learner";

/** The course's end-of-level review; Infinite Practice unlocks once it's done. */
const LEVEL_REVIEW_LESSON_ID = "level-review";

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
  // Offer reset whenever there's progress to wipe (any lesson started or
  // completed), so a learner can restart mid-course — not only at 6/6.
  const anyProgress = lessonOrder.some(
    (id) => lessonStatus(id) !== "available",
  );
  // Infinite Practice (Pillar B) is reached AFTER the level review, and only
  // with AI on — otherwise the entry point stays hidden so the AI-off path is
  // byte-for-byte Phase 1 (P1).
  const practiceUnlocked =
    aiEnabled() && lessonStatus(LEVEL_REVIEW_LESSON_ID) === "completed";
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
      {/* Bottom padding must clear the fixed CTA (offset + button height + drop
          shadow + safe-area) so the last lesson node can always scroll fully
          into view above it — short viewports were letting a node sit under the
          floating button. */}
      <main className="mx-auto max-w-5xl px-4 pt-10 pb-[calc(9.5rem_+_env(safe-area-inset-bottom,0px))] sm:px-6 lg:pt-12 lg:pb-[calc(10.5rem_+_env(safe-area-inset-bottom,0px))]">
        <h1 className="sr-only">{course.title}</h1>
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
            {practiceUnlocked ? (
              <PracticePromoCard
                onStart={() => void navigate({ to: "/practice" })}
              />
            ) : null}
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
                    canReset={anyProgress}
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
        <>
          {/* Static scrim behind the CTA: a node scrolling under the floating
              button fades into the page background instead of reading as a
              collision. Pure gradient (no animation), so it's reduced-motion
              safe; click-through so it never steals taps from the map. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(8rem_+_env(safe-area-inset-bottom,0px))] bg-gradient-to-t from-background to-background/0"
          />
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem_+_env(safe-area-inset-bottom,0px))] z-40 px-4 sm:px-6">
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
        </>
      ) : null}
    </div>
  );
}
