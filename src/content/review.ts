/**
 * Review composition (Phase 3, SPOV 8: retrieval over recognition).
 *
 * Spaced reviews, the cumulative level review, and the opening recall warm-up all
 * draw from one per-skill pool of authored problems (lesson steps + quiz
 * questions). Selection deliberately:
 *  - **favors generative interaction kinds** (produce the answer: numeric, count,
 *    tile, plot) over recognition kinds (multiple-choice, pick-a-side, …),
 *  - **interleaves** skills/types (mix, don't block) so the learner must select
 *    the right approach, and
 *  - **drops the scaffold** on demand — fading the decorative figure that
 *    supported first acquisition, so review is recall, not recognition.
 *
 * Everything here is pure + AI-off-safe: it composes hand-authored content only.
 */
import { lessons } from "./lessons";
import { quizzes } from "./quizzes";
import { lessonIndex, lessonOrder, skillsForLevel } from "./course";
import { getLesson } from "./lessons";
import { skillOrder, type SkillId } from "./skills";
import type { InteractionKind, ProblemStep } from "./types";

/** Fisher–Yates (new array). */
function shuffle<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 0 = generative (produce the answer), 1 = direct-manipulation on a figure,
 * 2 = recognition (spot the right option). Lower sorts first on review.
 */
function generativeRank(kind: InteractionKind): number {
  switch (kind) {
    case "numeric":
    case "count-squares":
    case "tile-expression":
    case "plot-points":
      return 0;
    case "pick-side":
    case "pick-sides":
    case "pick-angle":
      return 1;
    default:
      return 2; // multiple-choice, multi-select, tap-bar, categorize, slider
  }
}

// Kinds that render a *separate*, decorative figure above the interaction (so it
// is a scaffold that can be faded on review). The figure-as-interaction kinds
// (pick-side, plot-points, count-squares) need their figure to be answerable, so
// they are never stripped.
const SCAFFOLD_VISUAL_KINDS: readonly InteractionKind[] = [
  "numeric",
  "slider",
  "multiple-choice",
  "multi-select",
  "tap-bar",
  "categorize",
  "tile-expression",
];

/**
 * Fade the worked scaffold for a review: drop the decorative figure so the
 * learner recalls from the prompt alone. Prompts are self-contained (they carry
 * the numbers), so the problem stays answerable — just harder (a desirable
 * difficulty). No-op when the figure is the interaction itself.
 */
export function dropScaffold(step: ProblemStep): ProblemStep {
  if (step.visual && SCAFFOLD_VISUAL_KINDS.includes(step.interaction.kind)) {
    const { visual: _omit, ...rest } = step;
    void _omit;
    return rest;
  }
  return step;
}

// One-time per-skill pool: every authored problem tagged with the skill, quiz
// questions first (fresh numbers, distinct from the worked examples) then lesson
// steps.
const POOL: Record<SkillId, ProblemStep[]> = (() => {
  const pool = Object.fromEntries(
    skillOrder.map((id) => [id, [] as ProblemStep[]]),
  ) as Record<SkillId, ProblemStep[]>;
  for (const questions of Object.values(quizzes)) {
    for (const q of questions) pool[q.skill].push(q);
  }
  for (const lesson of Object.values(lessons)) {
    for (const step of lesson.steps) {
      if (step.kind === "problem") pool[step.skill].push(step);
    }
  }
  return pool;
})();

/** The candidate pool for a skill, generative kinds first (shuffled in-bucket). */
export function reviewPoolForSkill(skill: SkillId): ProblemStep[] {
  const buckets: ProblemStep[][] = [[], [], []];
  for (const step of POOL[skill]) {
    buckets[generativeRank(step.interaction.kind)].push(step);
  }
  return buckets.flatMap((bucket) => shuffle(bucket));
}

export interface PickOptions {
  /** Fade the decorative figure on each picked question (default false). */
  dropScaffold?: boolean;
}

/** Up to `count` review questions for a single skill (generative-first). */
export function pickReviewQuestions(
  skill: SkillId,
  count: number,
  opts: PickOptions = {},
): ProblemStep[] {
  const picked = reviewPoolForSkill(skill).slice(0, Math.max(0, count));
  return opts.dropScaffold ? picked.map(dropScaffold) : picked;
}

export interface ReviewSessionOptions {
  /** Questions per skill to pull (default 2). */
  perSkill?: number;
  /** Hard cap on session length (default 12). */
  max?: number;
  /** Fade scaffolds (default true — reviews are retrieval, not recognition). */
  dropScaffold?: boolean;
}

/**
 * Build an interleaved review session across the given skills: round-robin so
 * skills/types are mixed (not blocked), generative-first within each skill, and
 * (by default) scaffold-dropped.
 */
export function buildReviewSession(
  skillIds: readonly SkillId[],
  opts: ReviewSessionOptions = {},
): ProblemStep[] {
  const perSkill = opts.perSkill ?? 2;
  const max = opts.max ?? 12;
  const drop = opts.dropScaffold ?? true;

  const lists = skillIds.map((id) => reviewPoolForSkill(id).slice(0, perSkill));
  const out: ProblemStep[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < perSkill && out.length < max; round++) {
    for (const list of lists) {
      const q = list[round];
      if (q && !seen.has(q.id)) {
        out.push(q);
        seen.add(q.id);
        if (out.length >= max) break;
      }
    }
  }
  return drop ? out.map(dropScaffold) : out;
}

/**
 * The cumulative level review: interleaves **every** skill in the level (not
 * just the last lesson's), guaranteeing each appears at least once. Scaffolds are
 * kept here — this is the capstone test, so figures stay for fairness; the
 * spaced Reviews hub is where scaffolds are dropped.
 */
export function buildCumulativeLevelReview(
  levelId: string,
  count = 10,
): ProblemStep[] {
  const ids = skillsForLevel(levelId);
  if (ids.length === 0) return [];
  const lists = ids.map((id) => reviewPoolForSkill(id));
  const out: ProblemStep[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (out.length < count) {
    let added = false;
    for (const list of lists) {
      const q = list[round];
      if (q && !seen.has(q.id)) {
        out.push(q);
        seen.add(q.id);
        added = true;
        if (out.length >= count) break;
      }
    }
    round++;
    if (!added) break; // pools exhausted
  }
  return out;
}

/** Skills taught in lessons *before* the given lesson (for the recall warm-up). */
export function priorSkillsForLesson(lessonId: string): SkillId[] {
  const idx = lessonIndex(lessonId);
  if (idx <= 0) return [];
  const present = new Set<SkillId>();
  for (let i = 0; i < idx; i++) {
    const lesson = getLesson(lessonOrder[i]);
    if (!lesson) continue;
    for (const step of lesson.steps) {
      if (step.kind === "problem") present.add(step.skill);
    }
  }
  return skillOrder.filter((id) => present.has(id));
}
