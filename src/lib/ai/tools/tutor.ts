/**
 * Grounded tutor tools (PRD-phase-2 §3.3): `giveHint` / `explainMiss`.
 *
 * Both ground Koji in typed state (P2) and degrade gracefully to the Phase 1
 * static feedback if the model is off or unavailable (P5), so the learner is
 * never left stuck. Asking for either counts as *engaging Koji*, which (with a
 * genuine attempt) is what unlocks `revealSolution` (§2.3).
 *
 *  - `giveHint`    progressive hint; server post-checks it doesn't leak the answer.
 *  - `explainMiss` plain-language explanation of the last wrong answer; the gap is
 *                  diagnosed deterministically first, then phrased by the model.
 */
import { z } from "zod";

import { gradeStep } from "../../../content/engine";
import type { AnswerValue, ProblemStep } from "../../../content/types";
import { runTutor } from "../client";
import { diagnoseMistake, type MistakeDiagnosis } from "./diagnosis";
import { defineTool } from "./registry";

export type HintLevel = 1 | 2 | 3;

export interface GiveHintResult {
  ok: boolean;
  /** The tier delivered (1 names the idea … 3 sets it up). */
  level: HintLevel;
  /** Hint text, or null when none could be produced. */
  text: string | null;
  /** Where the hint came from. */
  source: "ai" | "static" | "none";
  reason?: string;
}

export interface ExplainMissResult {
  ok: boolean;
  /** Explanation text, or null when there's nothing to explain. */
  text: string | null;
  /** Deterministic diagnosis of the learner's gap (the ground truth). */
  diagnosis: MistakeDiagnosis | null;
  source: "ai" | "static" | "none";
  reason?: string;
}

function clampLevel(n: number): HintLevel {
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

/**
 * Phase 1 static fallback: the targeted hint for a wrong answer, else the step's
 * default. Shared by the voice tool layer and the Koji text panel so all three
 * surfaces degrade identically (P5) when the model is off or leaks the answer.
 */
export function staticHint(step: ProblemStep, answer: AnswerValue | null): string {
  if (answer) {
    const evaluation = gradeStep(step, answer);
    if (evaluation.status === "incorrect") return evaluation.message;
  }
  return step.feedback.default;
}

const giveHintParams = z.object({
  /** Hint tier 1–3; omit to escalate automatically from attempts so far. */
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const giveHint = defineTool({
  name: "giveHint",
  description:
    "Give a progressive hint for the current problem (tier 1 names the idea, tier 2 the next step, " +
    "tier 3 sets it up with their numbers — never the final answer). Omit level to escalate automatically.",
  parameters: giveHintParams,
  handler: async (args, ctx): Promise<GiveHintResult> => {
    // Asking Koji for a hint is engagement — record it even if the call fails.
    ctx.engagement.markHintUsed();

    const stepCtx = ctx.step;
    if (!stepCtx || stepCtx.step.kind !== "problem") {
      return { ok: false, level: 1, text: null, source: "none", reason: "No active problem." };
    }
    const step = stepCtx.step;
    const attempts = stepCtx.record?.attempts ?? 0;
    const level = args.level ?? clampLevel(Math.max(attempts, 1));

    const grounding = stepCtx.grounding();
    if (grounding && ctx.aiEnabled) {
      const res = await runTutor({ kind: "hint", grounding, hintLevel: level });
      if (res.ok && res.text) {
        return { ok: true, level, text: res.text, source: "ai" };
      }
    }

    // Graceful fallback to the hand-written hint (P5).
    return { ok: true, level, text: staticHint(step, stepCtx.answer), source: "static" };
  },
});

export const explainMiss = defineTool({
  name: "explainMiss",
  description:
    "Explain, in plain language, why the learner's most recent answer was wrong — naming the specific mistake. " +
    "The gap is diagnosed deterministically, so it always targets the actual error.",
  parameters: z.object({}),
  handler: async (_args, ctx): Promise<ExplainMissResult> => {
    // Asking Koji to explain a miss is engagement.
    ctx.engagement.markHintUsed();

    const stepCtx = ctx.step;
    if (!stepCtx || stepCtx.step.kind !== "problem") {
      return { ok: false, text: null, diagnosis: null, source: "none", reason: "No active problem." };
    }
    const step = stepCtx.step;
    const answer = stepCtx.answer;
    if (!answer) {
      return {
        ok: false,
        text: null,
        diagnosis: null,
        source: "none",
        reason: "No answer to explain yet.",
      };
    }
    if (gradeStep(step, answer).status === "correct") {
      return {
        ok: false,
        text: null,
        diagnosis: null,
        source: "none",
        reason: "That answer was correct — nothing to explain.",
      };
    }

    // Deterministic diagnosis first (P3): the ground truth the model phrases.
    const diagnosis = diagnoseMistake(step, answer);

    const grounding = stepCtx.grounding();
    if (grounding && ctx.aiEnabled) {
      const res = await runTutor({ kind: "explanation", grounding });
      if (res.ok && res.text) {
        return { ok: true, text: res.text, diagnosis, source: "ai" };
      }
    }

    // Fallback to the deterministic, answer-free summary (P5).
    return { ok: true, text: diagnosis.summary, diagnosis, source: "static" };
  },
});
