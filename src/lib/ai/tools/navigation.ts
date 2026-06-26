/**
 * Navigation tools (PRD-phase-2 §3.3): `goToLesson` / `resumeLesson`.
 *
 * These drive the course path through the host's `navigate` (so the tools never
 * touch the router). `goToLesson` resumes at the learner's saved position by
 * default; `resumeLesson` uses the learner's recommendation to pick up where
 * they left off. Both ensure the lesson's progress doc exists first.
 */
import { z } from "zod";

import { getLesson, lessonOrder } from "../../../content";
import { defineTool } from "./registry";

export interface GoToLessonResult {
  ok: boolean;
  /** The lesson navigated to (echoed back), or null on failure. */
  lessonId: string | null;
  /** The step index navigated to. */
  stepIndex: number;
  /** Why navigation failed (only when `ok` is false). */
  reason?: string;
}

export interface ResumeLessonResult {
  ok: boolean;
  /** What the recommendation resolved to. */
  kind: "start" | "continue" | "review" | "done";
  lessonId: string | null;
  stepIndex: number;
}

const goToLessonParams = z.object({
  /** Lesson to open. */
  lessonId: z.string().min(1),
  /** Optional step to jump to; defaults to the learner's saved position. */
  stepIndex: z.number().int().min(0).optional(),
});

export const goToLesson = defineTool({
  name: "goToLesson",
  description:
    "Navigate the learner to a lesson by id, resuming at their saved step unless a stepIndex is given. " +
    `Valid lessonId values: ${lessonOrder.join(", ")}.`,
  parameters: goToLessonParams,
  handler: async (args, ctx): Promise<GoToLessonResult> => {
    const lesson = getLesson(args.lessonId);
    if (!lesson) {
      return {
        ok: false,
        lessonId: null,
        stepIndex: 0,
        reason: `Unknown lessonId "${args.lessonId}".`,
      };
    }
    await ctx.learner.startLesson(args.lessonId);
    const lastStep = Math.max(lesson.steps.length - 1, 0);
    const requested = args.stepIndex ?? ctx.learner.resumeIndex(args.lessonId);
    const stepIndex = Math.min(Math.max(requested, 0), lastStep);
    await ctx.navigate({ to: "lesson", lessonId: args.lessonId, stepIndex });
    return { ok: true, lessonId: args.lessonId, stepIndex };
  },
});

export const resumeLesson = defineTool({
  name: "resumeLesson",
  description:
    "Resume the learner's course: continues an in-progress lesson, otherwise starts the next available one, " +
    "at the position the learner left off.",
  parameters: z.object({}),
  handler: async (_args, ctx): Promise<ResumeLessonResult> => {
    const rec = ctx.learner.recommendation();

    // Course finished: there's nothing to resume — send them to the map.
    if (rec.kind === "done") {
      await ctx.navigate({ to: "course-map" });
      return { ok: true, kind: "done", lessonId: rec.lessonId, stepIndex: 0 };
    }

    await ctx.learner.startLesson(rec.lessonId);
    const stepIndex = ctx.learner.resumeIndex(rec.lessonId);
    await ctx.navigate({ to: "lesson", lessonId: rec.lessonId, stepIndex });
    return { ok: true, kind: rec.kind, lessonId: rec.lessonId, stepIndex };
  },
});
