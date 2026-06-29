import { useEffect, useState } from "react";
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
import {
  difficultyFromHistory,
  PracticePromoCard,
  prewarmPracticeCache,
} from "../components/practice";
import {
  ReviewsCard,
  SimulateLevelReviewDialog,
  SimulateReviewDialog,
  SkillMasteryPanel,
} from "../components/review";
import { Button } from "../components/ui";
import {
  course,
  getLesson,
  getQuiz,
  lessonOrder,
  problemCount,
  type SkillId,
} from "../content";
import { aiEnabled } from "../lib/ai/flag";
import { useAuth } from "../lib/AuthContext";
import { devToolsEnabled } from "../lib/dev-flags";
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
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const {
    lessonStatus,
    recommendation,
    progress,
    progressLoaded,
    resetProgress,
    levelMastery,
    dueReviews,
    devMakeReviewsDue,
    devCompleteAllLessons,
    devSimulateReview,
    devSimulateLevelReview,
  } = useLearner();
  // DEV-only "Simulate a review" dialog (gated with the rest of the DEV TOOLS
  // card). `simNow` is captured when the dialog opens — an event, so calling
  // Date.now() there is fine (not during render) — and, because it only changes
  // on open, it both scopes the due-review count and doubles as the dialog's
  // remount key so its inputs re-seed from the current due count each open.
  const [simOpen, setSimOpen] = useState(false);
  const [simNow, setSimNow] = useState(() => Date.now());
  const openSimulateReview = () => {
    setSimNow(Date.now());
    setSimOpen(true);
  };
  const dueCount = dueReviews(simNow).length;
  // DEV-only "Simulate Level Review" dialog. `levelSimKey` only changes on open,
  // so it serves purely as the dialog's remount key (re-seeding its inputs each
  // open). The question count is static content; completion state is live.
  const [levelSimOpen, setLevelSimOpen] = useState(false);
  const [levelSimKey, setLevelSimKey] = useState(0);
  const openSimulateLevelReview = () => {
    setLevelSimKey((k) => k + 1);
    setLevelSimOpen(true);
  };
  const levelReviewQuestionCount = getQuiz(LEVEL_REVIEW_LESSON_ID)?.length ?? 0;
  const levelReviewCompleted =
    lessonStatus(LEVEL_REVIEW_LESSON_ID) === "completed";

  const levelId = course.levels[0].id;
  const gate = levelMastery(levelId);

  const openLesson = (lessonId: string) => {
    if (lessonStatus(lessonId) === "locked") return; // gated — can't enter yet
    // Launching from the map plays the branded intro animation (a transition).
    requestLessonIntro(lessonId);
    void navigate({ to: "/lesson/$lessonId", params: { lessonId } });
  };

  const reviewSkill = (skill: SkillId) =>
    void navigate({ to: "/reviews", search: { skill } });

  const rec = recommendation();
  // Offer reset whenever there's real progress to wipe (a lesson started or
  // completed) — not merely a locked-by-default node — so a fresh learner doesn't
  // see a reset button.
  const anyProgress = lessonOrder.some((id) => {
    const status = lessonStatus(id);
    return status === "completed" || status === "in_progress";
  });
  // Infinite Practice (Pillar B) is reached AFTER the level review, and only
  // with AI on — otherwise the entry point stays hidden so the AI-off path is
  // byte-for-byte Phase 1 (P1).
  const practiceUnlocked =
    aiEnabled() && lessonStatus(LEVEL_REVIEW_LESSON_ID) === "completed";
  // The difficulty the first practice batch should warm at — derived purely from
  // history (no Date.now / side effects, so it's safe during render). Used as the
  // pre-warm effect's dep, so only a change of difficulty BUCKET re-triggers it,
  // not every Firestore progress snapshot.
  const practiceDifficulty = difficultyFromHistory(progress);
  // Pre-warm the Infinite Practice cache in the BACKGROUND the moment it unlocks,
  // so the first visit serves from a warm cache instead of paying the visible
  // "Generating a fresh problem…" cold-start wait. Fire-and-forget and
  // idempotent: `prewarmPracticeCache` skips when the cache is already warm for
  // this difficulty, single-flights per uid, and is AI-off safe — so running it
  // on every mount only does real work when the cache is genuinely cold. The live
  // loop's own serve / prefetch logic is untouched (this just fills early).
  useEffect(() => {
    if (!practiceUnlocked || !uid) return;
    void prewarmPracticeCache(uid, practiceDifficulty).catch(() => {});
  }, [practiceUnlocked, uid, practiceDifficulty]);
  // The active "you are here" Koji marker appears once PROGRESS has hydrated, so
  // the recommendation points at the real current lesson rather than a pre-load
  // guess (a fresh learner correctly lands on lesson 1). It intentionally does
  // NOT also wait on the profile / skill-mastery snapshots, which the marker
  // doesn't need — waiting on those could leave it stuck if one is slow.
  const currentId = progressLoaded ? rec.lessonId : null;
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
      const status = lessonStatus(id);
      const state: CourseMapNode["state"] =
        status === "completed"
          ? "completed"
          : status === "locked"
            ? "locked"
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
          into view above it. Keeps phase-3's `w-full` and #9's safe-area pad. */}
      <main className="mx-auto w-full max-w-5xl px-4 pt-10 pb-[calc(9.5rem_+_env(safe-area-inset-bottom,0px))] sm:px-6 lg:pt-12 lg:pb-[calc(10.5rem_+_env(safe-area-inset-bottom,0px))]">
        <h1 className="sr-only">{course.title}</h1>
        <div className="grid gap-10 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-14">
          {/* Both columns flow in the normal document, so there is a single
              scrollbar — the page's own at the window edge — and each column runs
              to the page's true bottom (no capped, independently-scrolling rail
              that would cut off the taller column and leave dead space). */}
          <div className="space-y-5">
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

            {/* Spaced-repetition hub: reviews due + a due-soon forecast. */}
            <ReviewsCard onStart={() => void navigate({ to: "/reviews", search: {} })} />

            {/* The visible mastery signal + corrective loop (tap a weak skill to
                practice it). Provisional vs mastered is shown per skill. */}
            <SkillMasteryPanel
              levelId={levelId}
              onPractice={reviewSkill}
              hint={
                gate.allMastered
                  ? `All ${gate.total} skills are mastered. The Level Review is unlocked. A skill is mastered once it survives a spaced review.`
                  : `Master all ${gate.total} skills (${gate.mastered}/${gate.total} so far) to unlock the Level Review. A skill is mastered once it survives a spaced review.`
              }
            />

            {devToolsEnabled() ? (
              <div className="rounded-2xl border-2 border-border bg-background p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">
                  Dev tools
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Make reviews due now</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void devMakeReviewsDue()}
                    >
                      Run
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Complete all lessons</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => void devCompleteAllLessons()}
                    >
                      Run
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">Simulate a review</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={openSimulateReview}
                    >
                      Run
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted">
                      Simulate Level Review
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={openSimulateLevelReview}
                    >
                      Run
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

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

      {devToolsEnabled() ? (
        <>
          <SimulateReviewDialog
            isOpen={simOpen}
            onOpenChange={setSimOpen}
            seedKey={simNow}
            dueCount={dueCount}
            onConfirm={devSimulateReview}
          />
          <SimulateLevelReviewDialog
            isOpen={levelSimOpen}
            onOpenChange={setLevelSimOpen}
            seedKey={levelSimKey}
            questionCount={levelReviewQuestionCount}
            alreadyCompleted={levelReviewCompleted}
            onConfirm={devSimulateLevelReview}
          />
        </>
      ) : null}
    </div>
  );
}
