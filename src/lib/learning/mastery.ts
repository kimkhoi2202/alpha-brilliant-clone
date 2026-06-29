/**
 * Durable mastery logic (Phase 3, SPOV 6 + 7). Pure + deterministic, kept out of
 * the React store so it can be reasoned about (and unit-tested) on its own.
 *
 * The central redefinition: **mastery is not a one-time pass; it is surviving a
 * spaced review.** A first-try-correct demonstration earns a skill *provisional*
 * status; it only becomes *mastered* once it is recalled first-try on a review
 * that was actually due (real elapsed time past its FSRS `dueAt`). Mastery is
 * hard to EARN; once earned it is permanent (a later lapse still reschedules the
 * skill for reinforcement, but never revokes the badge).
 *
 * The outcome → FSRS grade map is the single boundary the whole layer keys off
 * (SPOV 7): **wrong or assisted = lapse (Again); correct after retries = Hard;
 * first-try correct (unaided) = Good.** We deliberately never emit Easy
 * (conservative — defaulting to Good is fine).
 */
import {
  init,
  review,
  type Grade,
  type SkillMemory,
} from "./fsrs";

/**
 * - `new`: never attempted.
 * - `learning`: attempted, but not yet recalled unaided on the first try.
 * - `provisional`: demonstrated first-try once — but hasn't survived a spaced
 *   review yet (could be a lucky moment of performance, not durable learning).
 * - `mastered`: survived ≥1 *due* spaced review with a first-try recall.
 */
export type MasteryLevel = "new" | "learning" | "provisional" | "mastered";

export interface SkillMastery {
  /** FSRS D/S/R memory state for this skill. */
  memory: SkillMemory;
  masteryLevel: MasteryLevel;
  /** Epoch ms the skill first reached `mastered` (permanent once set). */
  masteredAt: number | null;
  /** Whether a first-try-correct demonstration has ever happened (sticky). */
  provisional: boolean;
  /** Count of FSRS reviews applied (lesson steps, reviews, practice). */
  reviews: number;
  /** Count of lapses (Again) recorded. */
  lapses: number;
}

/** A graded outcome from the engine, mapped to an FSRS grade. */
export interface SkillOutcome {
  /** Whether the final answer was correct. */
  correct: boolean;
  /** Correct on the first, unaided attempt (no retries, no reveal). */
  firstTryCorrect: boolean;
  /** Revealed / Koji-assisted → always a lapse, never first-try mastery. */
  assisted?: boolean;
}

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  new: "Not started",
  learning: "Learning",
  provisional: "Provisional",
  mastered: "Mastered",
};

/** SPOV 7's outcome→grade boundary, encoded once. */
export function gradeForOutcome(o: SkillOutcome): Grade {
  if (!o.correct || o.assisted) return 1; // Again — couldn't produce it unaided
  if (o.firstTryCorrect) return 3; // Good — clean first-try recall
  return 2; // Hard — correct, but only after retries
}

/** A fresh, never-reviewed skill (due immediately). */
export function newSkillMastery(now: number = Date.now()): SkillMastery {
  return {
    memory: init(now),
    masteryLevel: "new",
    masteredAt: null,
    provisional: false,
    reviews: 0,
    lapses: 0,
  };
}

/**
 * Apply one graded outcome to a skill's state: update its FSRS memory and move
 * its mastery level per the durable-mastery rules above.
 *
 * `wasDue` (a genuinely-due spaced review) is captured *before* the FSRS update,
 * since `review()` pushes `dueAt` into the future. The very first encounter of a
 * skill is never "due" (no prior review), so a same-session pass can only ever
 * make a skill provisional, never mastered.
 */
export function applyOutcome(
  prev: SkillMastery | undefined | null,
  outcome: SkillOutcome,
  now: number = Date.now(),
): SkillMastery {
  const state = prev ?? newSkillMastery(now);
  const grade = gradeForOutcome(outcome);
  const wasDue = state.memory.lastReviewed !== null && now >= state.memory.dueAt;

  const memory = review(state.memory, grade, now);
  const reviews = state.reviews + 1;
  const lapses = state.lapses + (grade === 1 ? 1 : 0);

  let masteryLevel = state.masteryLevel;
  let masteredAt = state.masteredAt;
  let provisional = state.provisional;

  if (grade === 1) {
    // A miss reschedules the skill (its FSRS stability collapsed above, so it
    // comes due sooner) but NEVER revokes a level: once a skill is mastered it
    // stays mastered (the achievement is permanent). A brand-new skill just
    // becomes "learning" now that it has been seen.
    if (masteryLevel === "new") {
      masteryLevel = "learning";
    }
  } else if (grade >= 3) {
    // A clean, unaided first-try recall.
    if (!provisional) {
      provisional = true;
      masteryLevel = "provisional"; // first demonstration
    } else if (wasDue && masteryLevel !== "mastered") {
      masteryLevel = "mastered"; // survived a spaced review
      masteredAt = now;
    }
    // (already mastered, or provisional but not yet due → unchanged)
  } else {
    // grade === 2 (correct after retries): not an unaided demonstration.
    if (masteryLevel === "new") masteryLevel = "learning";
  }

  return { memory, masteryLevel, masteredAt, provisional, reviews, lapses };
}

const LEVEL_PROGRESS: Record<MasteryLevel, number> = {
  new: 0,
  learning: 0.34,
  provisional: 0.67,
  mastered: 1,
};

/** A 0–1 fill for the per-skill mastery meter. */
export function masteryProgress(state?: SkillMastery | null): number {
  return state ? LEVEL_PROGRESS[state.masteryLevel] : 0;
}

export function masteryLevelOf(state?: SkillMastery | null): MasteryLevel {
  return state?.masteryLevel ?? "new";
}

export function isMastered(state?: SkillMastery | null): boolean {
  return state?.masteryLevel === "mastered";
}
