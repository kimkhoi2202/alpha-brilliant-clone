import { useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { AppHeader } from "../components/chrome";
import { QuizRunner } from "../components/lesson";
import { Button, Callout } from "../components/ui";
import {
  buildReviewSession,
  getSkill,
  isSkillId,
  skillOrder,
  type ProblemStep,
  type SkillId,
} from "../content";
import { masteryLevelOf } from "../lib/learning/mastery";
import { useLearner } from "../lib/learner";

const reviewsRoute = getRouteApi("/reviews");

/**
 * Compose the session's questions once: a targeted single-skill corrective set
 * when a `skill` is given, else the due skills (most urgent first), else a
 * weak-skills / any-reviewed fallback so a deliberate "review now" is never empty.
 */
function buildSession(
  skill: string | undefined,
  dueReviews: (now: number) => SkillId[],
  hasState: (id: SkillId) => boolean,
  isMastered: (id: SkillId) => boolean,
): ProblemStep[] {
  if (skill && isSkillId(skill)) {
    return buildReviewSession([skill], { perSkill: 5, max: 6, dropScaffold: true });
  }
  const due = dueReviews(Date.now());
  if (due.length) {
    return buildReviewSession(due, { perSkill: 2, max: 12, dropScaffold: true });
  }
  const weak = skillOrder.filter((id) => hasState(id) && !isMastered(id));
  if (weak.length) {
    return buildReviewSession(weak, { perSkill: 2, max: 10, dropScaffold: true });
  }
  const any = skillOrder.filter(hasState);
  return buildReviewSession(any, { perSkill: 1, max: 8, dropScaffold: true });
}

/**
 * The spaced-review session runner (Phase 3, SPOV 7/8): pulls due skills'
 * problems, interleaves skills + types, favors generative kinds with the scaffold
 * dropped, and records each outcome into the skill's FSRS memory via
 * `recordReview`. Reuses `QuizRunner` (review mode) + `StepView` + `gradeStep`.
 * AI-off-safe — composed entirely from hand-authored content.
 */
export function ReviewSession() {
  const { loading } = useLearner();
  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-background text-muted">
        <p className="text-sm font-medium">Loading your reviews…</p>
      </div>
    );
  }
  return <ReviewSessionInner />;
}

function ReviewSessionInner() {
  const navigate = useNavigate();
  const { dueReviews, skillMastery, recordReview } = useLearner();
  const { skill } = reviewsRoute.useSearch();

  // Compose the session's question set EXACTLY ONCE, on mount — this inner runner
  // is only mounted once the learner data has loaded (the gate above), so the
  // first build sees complete data. Holding it in state (a lazy `useState`
  // initializer that never re-runs on re-render), instead of deriving it from live
  // learner state, means a Firestore snapshot landing mid-session only re-renders
  // this screen: the question set keeps its length/contents — and an in-progress
  // multi-step answer can't reset underneath the learner — until they finish or
  // leave. Scheduling (which skills are due, FSRS) is read once, here, at build
  // time, and is otherwise untouched.
  const [questions] = useState<ProblemStep[]>(() =>
    buildSession(
      skill,
      dueReviews,
      (id) => skillMastery(id) !== null,
      (id) => masteryLevelOf(skillMastery(id)) === "mastered",
    ),
  );

  const back = () => void navigate({ to: "/courses" });

  if (questions.length === 0) {
    return <ReviewEmpty onBack={back} />;
  }

  const targeted = skill && isSkillId(skill) ? getSkill(skill) : undefined;

  return (
    <QuizRunner
      mode="review"
      questions={questions}
      introTitle={targeted ? `Practice: ${targeted.label}` : "Review session"}
      introBody={
        targeted
          ? `Focused practice on ${targeted.label}. Recall ${questions.length} question${
              questions.length === 1 ? "" : "s"
            } from memory — no hints, pulling the answer out is the point.`
          : undefined
      }
      onQuestionGraded={(q, correct) =>
        void recordReview(q.skill, { correct, firstTryCorrect: correct })
      }
      onPassed={back}
      onExit={back}
    />
  );
}

function ReviewEmpty({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
        <h1 className="text-2xl font-bold tracking-tight">Spaced review</h1>
        <Callout intent="info" title="Nothing to review yet">
          Finish a lesson first — once you've learned some skills, they'll show up
          here for spaced review, and mastering them means surviving those reviews.
        </Callout>
        <Button variant="accent" size="lg" onPress={onBack}>
          Back to course
        </Button>
      </main>
    </div>
  );
}
