/**
 * Skill taxonomy (Phase 3): the small, bounded set of ~7 skills the spacing,
 * retrieval, and mastery layers all key off (Brainlift §B.3, SPOV 6–8).
 *
 * Each problem step (and quiz question) is tagged with exactly one `SkillId`
 * (see `ProblemStep.skill` in `types.ts`). Per-skill FSRS memory + mastery state
 * is then accrued through the single outcome chokepoint (`recordStep` in
 * `lib/learner.tsx`), so spaced reviews, the mastery gate, and the cumulative
 * level review all reason over the same unit.
 *
 * This module is deliberately dependency-free (no imports from `types.ts`) so it
 * can be imported by `types.ts` itself without a cycle.
 */

/** The seven skills of the Pythagorean-theorem chapter, in teaching order. */
export type SkillId =
  | "identify-sides"
  | "areas-of-squares"
  | "theorem-statement"
  | "find-hypotenuse"
  | "find-a-leg"
  | "right-triangle-test"
  | "coordinate-distance";

export interface Skill {
  id: SkillId;
  /** Short, learner-facing name (shown on mastery meters / review hub). */
  label: string;
  /** One-line description of what the skill is. */
  description: string;
  /** Teaching order (1-based), matching the lesson path. */
  order: number;
}

/**
 * The registry, in teaching order. The order matches the Brainlift's Phase-3
 * skill list exactly (identify-sides → areas-of-squares → theorem-statement →
 * find-hypotenuse → find-a-leg → right-triangle-test → coordinate-distance).
 */
export const skills: readonly Skill[] = [
  {
    id: "identify-sides",
    label: "Name the sides",
    description:
      "Identify the legs, hypotenuse, and right angle of a right triangle.",
    order: 1,
  },
  {
    id: "areas-of-squares",
    label: "Areas of squares",
    description:
      "Count the unit squares on each side and see a² + b² add up to c².",
    order: 2,
  },
  {
    id: "theorem-statement",
    label: "The theorem",
    description: "Read and build a² + b² = c² and what each part stands for.",
    order: 3,
  },
  {
    id: "find-hypotenuse",
    label: "Find the hypotenuse",
    description: "Square the legs, add them, and take the square root to get c.",
    order: 4,
  },
  {
    id: "find-a-leg",
    label: "Find a missing leg",
    description: "Rearrange to a² = c² − b² to find an unknown leg.",
    order: 5,
  },
  {
    id: "right-triangle-test",
    label: "Right-triangle test",
    description:
      "Use the converse: check whether a² + b² = c² to spot a right triangle.",
    order: 6,
  },
  {
    id: "coordinate-distance",
    label: "Distance on a grid",
    description:
      "Find the straight-line distance between two points as a hypotenuse.",
    order: 7,
  },
] as const;

/** Flat skill order (drives meters, review ordering, level aggregation). */
export const skillOrder: readonly SkillId[] = skills.map((s) => s.id);

const skillIndex: Record<SkillId, Skill> = Object.fromEntries(
  skills.map((s) => [s.id, s]),
) as Record<SkillId, Skill>;

/** Look up a skill by id (typed), or undefined for an unknown id. */
export function getSkill(id: string): Skill | undefined {
  return skillIndex[id as SkillId];
}

/** Narrow an arbitrary string to a known `SkillId`. */
export function isSkillId(id: string): id is SkillId {
  return id in skillIndex;
}
