/**
 * Difficulty selection for generated practice (PRD-phase-2 §3.3 `setDifficulty`,
 * §4.2 step 1: "pick template + difficulty from `StepRecord`").
 *
 * `setDifficulty` writes a session-scoped preference; `generatePractice` honors
 * it, falling back to a `StepRecord`-derived default ("derived from `StepRecord`
 * by default"). The preference is a small module-level signal (reset on reload),
 * which is all a single-learner client needs and keeps the tools self-contained.
 */
import type { GenerationDifficulty } from "../client";
import type { StepRecord } from "../../learner";

/** The buckets the generator supports, in ascending order. */
export const DIFFICULTY_LEVELS: readonly GenerationDifficulty[] = [
  "easy",
  "medium",
  "hard",
] as const;

/** Session-scoped difficulty preference; null means "derive from `StepRecord`". */
let preference: GenerationDifficulty | null = null;

/** The current preference, or null when generation should auto-derive. */
export function getDifficultyPreference(): GenerationDifficulty | null {
  return preference;
}

/** Set (or clear, with null) the session difficulty preference. */
export function setDifficultyPreference(level: GenerationDifficulty | null): void {
  preference = level;
}

/**
 * Default difficulty for the next problem, derived from how the learner did on
 * the current step: nailed it first try → push harder; needed help but got there
 * → hold steady; struggled or unsolved → ease off; not yet attempted → neutral.
 */
export function difficultyFromRecord(
  record: StepRecord | null | undefined,
): GenerationDifficulty {
  if (!record || record.attempts === 0) return "medium";
  if (record.firstTryCorrect) return "hard";
  if (record.correct) return "medium";
  return "easy";
}

/**
 * Resolve the difficulty to generate at: an explicit request wins, then the
 * session preference, then the `StepRecord`-derived default.
 */
export function resolveDifficulty(
  requested: GenerationDifficulty | undefined,
  record: StepRecord | null | undefined,
): GenerationDifficulty {
  return requested ?? getDifficultyPreference() ?? difficultyFromRecord(record);
}
