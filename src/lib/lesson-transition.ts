/**
 * One-shot signal for the map → lesson transition.
 *
 * The branded Rive animation is a *transition*, not a loading spinner: it should
 * only play when the learner deliberately launches a lesson from the course map.
 * The map calls `requestLessonIntro(id)` right before navigating; the lesson
 * player reads it once on entry and then clears it, so it never replays on a
 * refresh, an in-lesson re-render, or "Next lesson". Genuine data loading uses a
 * skeleton instead.
 */
let pendingIntroLessonId: string | null = null;

/** Arm the intro for the next lesson navigation (call before `navigate`). */
export function requestLessonIntro(lessonId: string): void {
  pendingIntroLessonId = lessonId;
}

/** Whether an intro is armed for this lesson (pure read, no side effects). */
export function peekLessonIntro(lessonId: string): boolean {
  return pendingIntroLessonId === lessonId;
}

/** Consume the armed intro so it can't replay. */
export function clearLessonIntro(): void {
  pendingIntroLessonId = null;
}
