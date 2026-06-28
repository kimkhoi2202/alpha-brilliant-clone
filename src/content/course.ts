import { getLesson } from "./lessons";
import { skillOrder, type SkillId } from "./skills";
import type { Course, CourseLevel, LessonId } from "./types";

export const course: Course = {
  id: "pythagoras",
  title: "The Pythagorean Theorem",
  description:
    "Discover and prove $a^2 + b^2 = c^2$ by counting and rearranging areas, then use it to measure triangles and distances.",
  accent: "accent",
  levels: [
    {
      id: "level-1",
      label: "LEVEL 1",
      title: "The Pythagorean Theorem",
      objectives: [
        "Name the legs, hypotenuse, and right angle of a right triangle",
        "Discover and prove $a^2 + b^2 = c^2$ by counting and rearranging areas",
        "Find the hypotenuse, and rearrange to find a missing leg",
        "Measure the straight-line distance between two points",
      ],
      lessonIds: [
        "pythagoras-intro",
        "discover-theorem",
        "use-the-theorem",
        "find-a-missing-leg",
        "direct-distance",
        "level-review",
      ],
    },
  ],
};

/** Flat lesson order across all levels, drives sequential unlocking. */
export const lessonOrder: LessonId[] = course.levels.flatMap(
  (level) => level.lessonIds,
);

export function lessonIndex(id: LessonId): number {
  return lessonOrder.indexOf(id);
}

export function firstLessonId(): LessonId {
  return lessonOrder[0];
}

/** The next lesson in the path, or null at the end of the chapter. */
export function nextLessonId(id: LessonId): LessonId | null {
  const i = lessonIndex(id);
  if (i < 0 || i >= lessonOrder.length - 1) return null;
  return lessonOrder[i + 1];
}

// ---------------------------------------------------------------------------
// Level + skill helpers (Phase 3): the mastery gate locks at level boundaries,
// and the cumulative review pulls from every skill in a level.
// ---------------------------------------------------------------------------

/** The level that contains a lesson, or undefined if it isn't in the path. */
export function levelForLesson(id: LessonId): CourseLevel | undefined {
  return course.levels.find((lvl) => lvl.lessonIds.includes(id));
}

/** A lesson by id. */
export function getLevel(levelId: string): CourseLevel | undefined {
  return course.levels.find((lvl) => lvl.id === levelId);
}

/**
 * A "review lesson" is the level's capstone with no teaching steps — entering it
 * launches straight into the cumulative quiz. It is the lesson the level gate
 * locks until the level's skills are mastered.
 */
export function isReviewLesson(id: LessonId): boolean {
  const lesson = getLesson(id);
  return !!lesson && lesson.steps.length === 0;
}

/** Index of a level in the course (for "is a later level" gating). */
export function levelIndex(levelId: string): number {
  return course.levels.findIndex((lvl) => lvl.id === levelId);
}

/**
 * The unique skills a level's lessons exercise, in canonical skill order. Drives
 * the per-level mastery aggregate, the level gate, and the cumulative review.
 */
export function skillsForLevel(levelId: string): SkillId[] {
  const level = getLevel(levelId);
  if (!level) return [];
  const present = new Set<SkillId>();
  for (const lessonId of level.lessonIds) {
    const lesson = getLesson(lessonId);
    if (!lesson) continue;
    for (const step of lesson.steps) {
      if (step.kind === "problem") present.add(step.skill);
    }
  }
  return skillOrder.filter((id) => present.has(id));
}

/** The first lesson whose problem steps teach a given skill (for "shore up X"). */
export function lessonForSkill(skill: SkillId): LessonId | undefined {
  return lessonOrder.find((id) => {
    const lesson = getLesson(id);
    return lesson?.steps.some(
      (step) => step.kind === "problem" && step.skill === skill,
    );
  });
}
