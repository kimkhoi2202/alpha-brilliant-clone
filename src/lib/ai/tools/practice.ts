/**
 * Generation tools (PRD-phase-2 §3.3): `generatePractice` / `setDifficulty`.
 *
 * `generatePractice` is the Pillar B entry point: it asks the server to generate
 * a candidate `ProblemStep`, then runs it through the verification firewall
 * (`verifyGeneratedProblem`) before returning it. Nothing unverified is ever
 * handed back (P4). `setDifficulty` records the difficulty the generator should
 * target; both default to a difficulty derived from the learner's `StepRecord`.
 */
import { z } from "zod";

import type { ProblemStep } from "../../../content/types";
import {
  generateProblem,
  type GeneratableInteractionKind,
  type GenerationDifficulty,
} from "../client";
import { verifyGeneratedProblem } from "../verify";
import {
  difficultyFromRecord,
  resolveDifficulty,
  setDifficultyPreference,
} from "./difficulty";
import { defineTool, type ToolContext } from "./registry";

/** The interaction kinds generation is restricted to (PRD §3.4). */
const GENERATABLE_KINDS = [
  "numeric",
  "count-squares",
  "pick-side",
  "multiple-choice",
  "tile-expression",
] as const;

const MAX_PER_CALL = 3;

export interface GeneratePracticeResult {
  ok: boolean;
  /** Verified problems, tagged `source:"ai"` and safe to render. */
  problems: ProblemStep[];
  /** How many were requested. */
  requested: number;
  /** How many passed verification. */
  accepted: number;
  /** How many were generated but rejected by the firewall. */
  rejected: number;
  difficulty: GenerationDifficulty;
  interactionKind: GeneratableInteractionKind;
  reason?: string;
}

export interface SetDifficultyResult {
  ok: boolean;
  /** The new preference; null means "auto-derive from `StepRecord`". */
  difficulty: GenerationDifficulty | null;
  /** What auto-derivation would currently pick (for reference). */
  derivedDefault: GenerationDifficulty;
}

/** Default the generated kind to the current step's kind when it's generatable. */
function defaultKind(ctx: ToolContext): GeneratableInteractionKind {
  const current =
    ctx.step?.step.kind === "problem" ? ctx.step.step.interaction.kind : null;
  if (current && (GENERATABLE_KINDS as readonly string[]).includes(current)) {
    return current as GeneratableInteractionKind;
  }
  return "numeric";
}

const generatePracticeParams = z.object({
  /** Which verifiable interaction kind to generate; defaults to the current step's. */
  interactionKind: z.enum(GENERATABLE_KINDS).optional(),
  /** Target difficulty; defaults to the session preference, then `StepRecord`. */
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  /** How many to generate (1–3). */
  count: z.number().int().min(1).max(MAX_PER_CALL).optional(),
});

export const generatePractice = defineTool({
  name: "generatePractice",
  description:
    "Generate fresh, verified practice problems (Pillar B). Each problem's answer is computed and " +
    "round-tripped through the grader before it's returned, so every problem is solvable and correct.",
  parameters: generatePracticeParams,
  handler: async (args, ctx): Promise<GeneratePracticeResult> => {
    const interactionKind = args.interactionKind ?? defaultKind(ctx);
    const difficulty = resolveDifficulty(args.difficulty, ctx.step?.record);
    const count = args.count ?? 1;

    if (!ctx.aiEnabled) {
      return {
        ok: false,
        problems: [],
        requested: 0,
        accepted: 0,
        rejected: 0,
        difficulty,
        interactionKind,
        reason: "AI is off.",
      };
    }

    const problems: ProblemStep[] = [];
    let rejected = 0;

    for (let i = 0; i < count; i++) {
      const res = await generateProblem({ interactionKind, difficulty });
      if (!res.ok || !res.step) {
        rejected++;
        continue;
      }
      // Verification firewall: only verified problems reach the learner (P4).
      const verification = verifyGeneratedProblem(res.step);
      if (verification.ok) {
        problems.push({ ...res.step, source: "ai" });
      } else {
        rejected++;
      }
    }

    return {
      ok: problems.length > 0,
      problems,
      requested: count,
      accepted: problems.length,
      rejected,
      difficulty,
      interactionKind,
      reason: problems.length === 0 ? "No problem passed verification." : undefined,
    };
  },
});

const setDifficultyParams = z.object({
  /** Target difficulty, or "auto" to derive from the learner's `StepRecord`. */
  level: z.enum(["easy", "medium", "hard", "auto"]),
});

export const setDifficulty = defineTool({
  name: "setDifficulty",
  description:
    "Set the difficulty for generated practice (easy | medium | hard), or 'auto' to derive it from the " +
    "learner's recent performance. Applies to subsequent generatePractice calls.",
  parameters: setDifficultyParams,
  handler: (args, ctx): SetDifficultyResult => {
    const difficulty = args.level === "auto" ? null : args.level;
    setDifficultyPreference(difficulty);
    return {
      ok: true,
      difficulty,
      derivedDefault: difficultyFromRecord(ctx.step?.record),
    };
  },
});
