import type { Course, LessonId } from "./types";

export const course: Course = {
  id: "pythagoras",
  title: "The Pythagorean Theorem",
  description:
    "Learn right triangles by doing — drag, plot, and build your way to a² + b² = c².",
  accent: "accent",
  levels: [
    {
      id: "level-1",
      label: "LEVEL 1",
      title: "Pythagoras",
      lessonIds: [
        "pythagoras-intro",
        "direct-distance",
        "squares-and-sides",
        "proving-pythagoras",
        "level-review",
      ],
    },
  ],
};

/** Flat lesson order across all levels — drives sequential unlocking. */
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
