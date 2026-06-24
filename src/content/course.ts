import type { Course, LessonId } from "./types";

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
