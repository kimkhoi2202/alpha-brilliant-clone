/**
 * Host helpers for constructing a `ToolContext` (PRD-phase-2 §3.3).
 *
 * The lesson player and the agent shells build a `ToolStepContext` from typed
 * lesson + progress state with `createStepContext`. Centralizing it here keeps
 * the grounding built one way (via `buildGrounding`, P2) so every surface — text
 * and voice — grounds Koji identically.
 */
import type { AnswerValue, LessonId, Step } from "../../../content/types";
import type { StepRecord } from "../../learner";
import { buildGrounding, type Grounding } from "../grounding";
import type { ToolStepContext } from "./registry";

export interface StepContextInput {
  /** The lesson the step belongs to. */
  lessonId: LessonId;
  /** The current step (concept or problem). */
  step: Step;
  /** The learner's in-progress answer, or null. */
  answer: AnswerValue | null;
  /** The learner's `StepRecord` for this step so far, if any. */
  record?: StepRecord | null;
}

/**
 * Build the `ToolStepContext` for the step the learner is on. `grounding()`
 * returns the structured payload for problem steps and null for concept steps
 * (which aren't graded, so there's nothing to ground).
 */
export function createStepContext(input: StepContextInput): ToolStepContext {
  const { lessonId, step, answer } = input;
  const record = input.record ?? null;

  return {
    lessonId,
    step,
    answer,
    record,
    grounding(): Grounding | null {
      if (step.kind !== "problem") return null;
      return buildGrounding(step, answer, record ?? undefined);
    },
  };
}
