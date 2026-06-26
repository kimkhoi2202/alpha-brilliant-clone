/**
 * Progress tool (PRD-phase-2 §3.3): `readProgress`.
 *
 * A read-only snapshot of the learner's streak, XP, and mastery signal — own
 * data only (it reads the same learner store the UI uses). Optionally drills
 * into one lesson's per-step stats so Koji can reference concrete progress.
 */
import { z } from "zod";

import { getLesson, lessonOrder, problemCount } from "../../../content";
import type {
  LessonStatus,
  Recommendation,
} from "../../learner";
import { defineTool, type ToolContext } from "./registry";

export interface LessonProgressSummary {
  lessonId: string;
  status: LessonStatus;
  currentStepIndex: number;
  /** Number of gradeable problem steps in the lesson. */
  problemCount: number;
  /** Steps with at least one recorded attempt. */
  attempted: number;
  /** Steps solved on the first try (the mastery signal). */
  firstTryCorrect: number;
  needsReview: boolean;
}

export interface ReadProgressResult {
  ok: boolean;
  signedIn: boolean;
  streak: { current: number; longest: number };
  xp: number;
  lessons: {
    total: number;
    completed: number;
    inProgress: number;
    available: number;
  };
  recommendation: Recommendation;
  /** Per-lesson detail when a (valid) lessonId is supplied. */
  lesson: LessonProgressSummary | null;
}

function lessonSummary(
  lessonId: string,
  ctx: ToolContext,
): LessonProgressSummary | null {
  const lesson = getLesson(lessonId);
  if (!lesson) return null;
  const record = ctx.learner.progress[lessonId];
  const steps = record ? Object.values(record.steps) : [];
  return {
    lessonId,
    status: ctx.learner.lessonStatus(lessonId),
    currentStepIndex: record?.currentStepIndex ?? 0,
    problemCount: problemCount(lesson),
    attempted: steps.filter((s) => s.attempts > 0).length,
    firstTryCorrect: steps.filter((s) => s.firstTryCorrect).length,
    needsReview: ctx.learner.needsReview(lessonId),
  };
}

const readProgressParams = z.object({
  /** Optional lesson to include detailed per-step stats for. */
  lessonId: z.string().min(1).optional(),
});

export const readProgress = defineTool({
  name: "readProgress",
  description:
    "Read the learner's current streak, XP, and per-lesson mastery signal (read-only). " +
    "Pass a lessonId to include that lesson's detailed progress.",
  parameters: readProgressParams,
  handler: (args, ctx): ReadProgressResult => {
    const profile = ctx.learner.profile;

    let completed = 0;
    let inProgress = 0;
    let available = 0;
    for (const id of lessonOrder) {
      const status = ctx.learner.lessonStatus(id);
      if (status === "completed") completed++;
      else if (status === "in_progress") inProgress++;
      else available++;
    }

    return {
      ok: true,
      signedIn: profile !== null,
      streak: {
        current: profile?.currentStreak ?? 0,
        longest: profile?.longestStreak ?? 0,
      },
      xp: profile?.totalXp ?? 0,
      lessons: {
        total: lessonOrder.length,
        completed,
        inProgress,
        available,
      },
      recommendation: ctx.learner.recommendation(),
      lesson: args.lessonId ? lessonSummary(args.lessonId, ctx) : null,
    };
  },
});
