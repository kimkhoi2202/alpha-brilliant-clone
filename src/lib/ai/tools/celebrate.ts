/**
 * Celebration tool (PRD-phase-2 §3.3): `celebrate`.
 *
 * Cosmetic: fires Koji's success/streak animation via the mascot reaction
 * handle. No-ops gracefully when no mascot is mounted (e.g. a voice-only
 * surface), so it's always safe for the agent to call after a win.
 */
import { z } from "zod";

import { defineTool } from "./registry";

export interface CelebrateResult {
  ok: boolean;
  /** Which reaction fired ("none" when no mascot is mounted). */
  fired: "success" | "none";
  /** The learner's current streak, for the agent's spoken response. */
  streak: number;
  reason?: string;
}

const celebrateParams = z.object({
  /** What we're celebrating (drives the agent's words; the animation is shared). */
  occasion: z
    .enum(["correct", "streak", "lesson-complete", "milestone"])
    .optional(),
});

export const celebrate = defineTool({
  name: "celebrate",
  description:
    "Fire Koji's success/streak celebration animation (cosmetic). Use after a correct answer, a streak, " +
    "or finishing a lesson.",
  parameters: celebrateParams,
  handler: (_args, ctx): CelebrateResult => {
    const streak = ctx.learner.profile?.currentStreak ?? 0;
    if (!ctx.koji) {
      return { ok: false, fired: "none", streak, reason: "No mascot mounted." };
    }
    ctx.koji.success();
    return { ok: true, fired: "success", streak };
  },
});
