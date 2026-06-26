/**
 * Adaptive difficulty for Infinite Practice (PRD-phase-2 §4.2, step 1: "pick
 * difficulty from `StepRecord` — first-try accuracy, attempts, hints used").
 *
 * Pure and synchronous: difficulty is derived from the learner's typed history
 * (`StepRecord`s already persisted by the lesson runner) plus, optionally, the
 * results of the current practice session, so the loop ramps with the learner
 * without any network round-trip. Phase 2 adapts only *difficulty* (per §2.4),
 * never sequencing.
 */
import type { GenerationDifficulty } from "../../lib/ai/client";
import type { LessonProgress, StepRecord } from "../../lib/learner";

/** A compact accuracy signal distilled from a set of `StepRecord`s. */
export interface PracticeAccuracy {
  /** How many graded problem steps fed the signal. */
  samples: number;
  /** Fraction solved correctly on the very first try (0–1). */
  firstTryRate: number;
  /** Average number of *wrong* attempts per step (first-try = 0). */
  avgAttempts: number;
}

/**
 * Below this many samples we don't trust the signal yet and start everyone at a
 * neutral "medium" (a learner reaching practice after the course usually has far
 * more than this, so it's just a cold-start guard).
 */
const COLD_START_MIN_SAMPLES = 3;

/** Flatten every `StepRecord` across all lessons into a single list. */
function collectRecords(progress: Record<string, LessonProgress>): StepRecord[] {
  const records: StepRecord[] = [];
  for (const lesson of Object.values(progress)) {
    for (const record of Object.values(lesson.steps)) records.push(record);
  }
  return records;
}

/** Distil a list of step records into the accuracy signal. */
export function summarizeAccuracy(records: StepRecord[]): PracticeAccuracy {
  const samples = records.length;
  if (samples === 0) return { samples: 0, firstTryRate: 0, avgAttempts: 0 };
  const firstTry = records.filter((r) => r.firstTryCorrect).length;
  const attempts = records.reduce((sum, r) => sum + Math.max(0, r.attempts), 0);
  return {
    samples,
    firstTryRate: firstTry / samples,
    avgAttempts: attempts / samples,
  };
}

/** Map an accuracy signal onto a generation difficulty bucket. */
export function difficultyForAccuracy(
  acc: PracticeAccuracy,
): GenerationDifficulty {
  if (acc.samples < COLD_START_MIN_SAMPLES) return "medium";
  // Confident and efficient → push them with harder problems.
  if (acc.firstTryRate >= 0.8 && acc.avgAttempts <= 1.3) return "hard";
  // Struggling (low first-try rate or many attempts) → ease off.
  if (acc.firstTryRate < 0.5 || acc.avgAttempts >= 2.2) return "easy";
  return "medium";
}

/**
 * Derive a practice difficulty from the learner's lesson history.
 *
 * `sessionRecords` (optional) lets the live practice session fold its own
 * results back in, so a hot/cold streak nudges the next problem's difficulty
 * without waiting for anything to persist.
 */
export function difficultyFromHistory(
  progress: Record<string, LessonProgress>,
  sessionRecords: StepRecord[] = [],
): GenerationDifficulty {
  const records = [...collectRecords(progress), ...sessionRecords];
  return difficultyForAccuracy(summarizeAccuracy(records));
}
