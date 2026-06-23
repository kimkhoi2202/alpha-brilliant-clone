import { useLearner } from "../lib/learner";

/** Progress + path actions/selectors for the signed-in learner. */
export function useProgress() {
  const {
    progress,
    lessonStatus,
    resumeIndex,
    needsReview,
    recommendation,
    startLesson,
    setStepIndex,
    recordStep,
    completeLesson,
  } = useLearner();
  return {
    progress,
    lessonStatus,
    resumeIndex,
    needsReview,
    recommendation,
    startLesson,
    setStepIndex,
    recordStep,
    completeLesson,
  };
}
