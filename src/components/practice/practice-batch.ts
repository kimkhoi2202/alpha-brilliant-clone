/**
 * Shared batch-generation primitives for Infinite Practice (Phase 3, Pillar B).
 *
 * Both the live loop (`useInfinitePractice`) and the background pre-warm
 * (`prewarmPracticeCache`) build a batch the SAME way: ask `generateProblems`
 * for one candidate per kind in `ROTATION`, then keep only the candidates that
 * pass `verifyGeneratedProblem` (tagging their provenance). Centralizing the
 * rotation + verify-and-tag filter here keeps the two paths from drifting.
 *
 * The hook still interleaves its own supersession checks (StrictMode de-dupe /
 * difficulty changes) BETWEEN generating and verifying, so it composes
 * `generateProblems` + `verifyBatch` directly to keep that ordering byte-for-byte
 * identical. The pre-warm has no such concerns, so it uses the combined
 * `generatePracticeBatch` convenience wrapper.
 */
import type { ProblemStep } from "../../content/types";
import {
  generateProblems,
  type GeneratableInteractionKind,
  type GenerationDifficulty,
} from "../../lib/ai/client";
import { verifyGeneratedProblem } from "../../lib/ai/verify";

/** Verifiable kinds; a batch generates exactly one of each, in this order (§3.4). */
export const ROTATION: readonly GeneratableInteractionKind[] = [
  "numeric",
  "count-squares",
  "pick-side",
  "multiple-choice",
  "tile-expression",
];

/**
 * Re-verify a batch of raw candidates, keeping only the ones that pass and
 * tagging their provenance (P4). A backend that's off / failing / partial simply
 * yields fewer (or zero) verified problems — never a wrong one.
 */
export function verifyBatch(steps: ProblemStep[]): ProblemStep[] {
  const verified: ProblemStep[] = [];
  for (const step of steps) {
    const verdict = verifyGeneratedProblem(step);
    if (verdict.ok) {
      verified.push({ ...step, source: "ai" });
    } else if (import.meta.env.DEV) {
      console.warn("[infinite-practice] rejected generated candidate:", verdict.errors);
    }
  }
  return verified;
}

/**
 * Generate ONE batch — one candidate per kind in `ROTATION` at `difficulty` —
 * and resolve to only the verified, provenance-tagged steps.
 *
 * AI-off / failure safe (P1/P5): `generateProblems` early-returns a safe empty
 * batch (it never throws) when AI is off or the backend fails, so this resolves
 * to `[]` rather than rejecting. Callers treat `[]` as "nothing to serve / cache".
 */
export async function generatePracticeBatch(
  difficulty: GenerationDifficulty,
  seed: number,
): Promise<ProblemStep[]> {
  const { steps } = await generateProblems({
    kinds: [...ROTATION],
    difficulty,
    seed,
  });
  return verifyBatch(steps);
}
