/**
 * Reveal-solution tool (PRD-phase-2 §2.3, §3.3): `revealSolution`.
 *
 * The one pedagogy guardrail. The answer is **earned, not free**:
 *
 *  - **Effort-gated.** Returns the worked answer only when the learner has
 *    genuinely attempted the step (`attempts > 0` in their `StepRecord`) AND
 *    engaged Koji (a hint or a conversation). Otherwise `{ allowed:false }`.
 *  - **Learner-initiated, never auto-invoked.** The agent must call this only on
 *    the learner's explicit request; the effort gate is the enforced backstop.
 *  - **Engine-computed.** The answer comes from `correctAnswer()` — never the
 *    model (P4) — so a revealed answer is always correct.
 *  - **Marked `assisted`.** Records the step as `assisted` (and never first-try),
 *    so a reveal never counts as mastery (§2.3).
 *  - **Personalized.** Names the learner's specific gap (diagnosed
 *    deterministically) and, when AI is on, adds a warmer model-phrased walk-through.
 */
import { z } from "zod";

import { correctAnswer } from "../../../content/engine";
import type { AnswerValue } from "../../../content/types";
import { runTutor } from "../client";
import {
  diagnoseMistake,
  formatAnswer,
  workedSolution,
  type MistakeDiagnosis,
} from "./diagnosis";
import { defineTool } from "./registry";

/** Reveal refused because the effort gate wasn't met. */
export interface RevealDenied {
  allowed: false;
  reason: string;
}

/** Reveal granted: the engine-computed worked answer + personalized gap. */
export interface RevealAllowed {
  allowed: true;
  /** Engine-computed correct answer (never from the model). */
  answer: AnswerValue;
  /** Human-readable rendering of the answer. */
  answerText: string;
  /** Worked solution (e.g. the a² + b² = c² steps), engine-derived. */
  worked: string;
  /** Deterministic diagnosis of the learner's specific gap. */
  diagnosis: MistakeDiagnosis;
  /** Authoritative, answer-correct walk-through (gap + worked solution). */
  explanation: string;
  /** Optional warmer, model-phrased narrative; null when AI is off/unavailable. */
  narrative: string | null;
  /** Always true: a revealed step never counts as first-try mastery. */
  assisted: true;
}

export type RevealSolutionResult = RevealDenied | RevealAllowed;

export const revealSolution = defineTool({
  name: "revealSolution",
  description:
    "Reveal the worked answer to the current problem. Effort-gated: only allowed after the learner has " +
    "genuinely attempted it AND engaged Koji (a hint or conversation). Learner-initiated only — never " +
    "call this on your own. The answer is engine-computed and the step is marked assisted (no mastery credit).",
  parameters: z.object({}),
  handler: async (_args, ctx): Promise<RevealSolutionResult> => {
    const stepCtx = ctx.step;
    if (!stepCtx || stepCtx.step.kind !== "problem") {
      return { allowed: false, reason: "There's no active problem to reveal." };
    }
    const step = stepCtx.step;

    // Already solved: there's nothing to reveal. Short-circuit before the gate so
    // a voice agent that calls this after a correct answer gets a clean no-op.
    if (stepCtx.record?.correct) {
      return {
        allowed: false,
        reason: "You already solved this one — nice work! Ask me for a fresh problem if you want more.",
      };
    }

    // --- The effort gate (§2.3): genuine attempt AND Koji engagement. ---
    const attempts = stepCtx.record?.attempts ?? 0;
    if (attempts <= 0) {
      return {
        allowed: false,
        reason: "Give it a real attempt first — try the problem, then I can reveal the answer.",
      };
    }
    const engaged =
      ctx.engagement.hasUsedHint() || ctx.engagement.hasTalkedToKoji();
    if (!engaged) {
      return {
        allowed: false,
        reason:
          "Let's work on it together first — ask me for a hint or talk it through, then I'll reveal the answer.",
      };
    }

    // --- Engine-computed answer + deterministic, personalized gap (P3/P4). ---
    const answer = correctAnswer(step.interaction);
    const answerText = formatAnswer(step.interaction, answer);
    const worked = workedSolution(step);
    const diagnosis = diagnoseMistake(step, stepCtx.answer);
    const explanation = `${diagnosis.summary} ${worked}`;

    // Optional warmer phrasing from the model (the answer stays engine-computed).
    let narrative: string | null = null;
    const grounding = stepCtx.grounding();
    if (ctx.aiEnabled && grounding) {
      const res = await runTutor({ kind: "explanation", grounding });
      narrative = res.ok ? res.text : null;
    }

    // --- Mark the step assisted: never first-try mastery (§2.3). A reveal is a
    // lapse for the step's skill (Phase 3) — accrued via the recordStep chokepoint.
    await ctx.learner.recordStep(stepCtx.lessonId, {
      stepId: step.id,
      skill: step.skill,
      attempts,
      correct: stepCtx.record?.correct ?? false,
      hintsUsed: true,
      firstTryCorrect: false,
      assisted: true,
    });

    return {
      allowed: true,
      answer,
      answerText,
      worked,
      diagnosis,
      explanation,
      narrative,
      assisted: true,
    };
  },
});
