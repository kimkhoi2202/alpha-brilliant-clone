/**
 * The Infinite Practice generation loop (PRD-phase-2 §4.2, Pillar B).
 *
 * Each cycle asks the gated `generateProblem` callable for a candidate, then
 * runs it through the verification firewall (`verifyGeneratedProblem`) before it
 * is ever exposed. Per P4 ("the AI never emits a wrong answer") a candidate that
 * fails verification is *discarded and another requested* — nothing unverified
 * reaches state, so the renderer only ever sees a problem the pure engine +
 * `math.js` already certified. It rotates across the verifiable interaction
 * kinds so practice stays varied.
 *
 * This hook assumes AI is enabled; mount it only behind `aiEnabled()` so the
 * AI-off path never runs the loop (it would otherwise just surface the
 * graceful "couldn't generate" state from `generateProblem`'s safe nulls).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { ProblemStep } from "../../content/types";
import {
  generateProblem,
  type GeneratableInteractionKind,
  type GenerationDifficulty,
} from "../../lib/ai/client";
import { verifyGeneratedProblem } from "../../lib/ai/verify";

/** Verifiable kinds, rotated in order so the loop covers the full set (§3.4). */
const ROTATION: readonly GeneratableInteractionKind[] = [
  "numeric",
  "count-squares",
  "pick-side",
  "multiple-choice",
  "tile-expression",
];

/**
 * How many candidates to try before giving up on a single problem. Covers a few
 * rejected generations (or a flaky/empty backend) without spinning forever.
 */
const MAX_CANDIDATES_PER_PROBLEM = 8;

export type PracticeStatus = "loading" | "ready" | "error";

export interface InfinitePracticeState {
  status: PracticeStatus;
  /** The current VERIFIED problem (tagged `source:"ai"`), or null while loading. */
  problem: ProblemStep | null;
  /** Interaction kind of the current problem (for the header / debugging). */
  kind: GeneratableInteractionKind | null;
  /** Monotonic id of the current problem — use as a React `key` to remount. */
  token: number;
  /** Request the next problem (drives the endless loop). */
  next: () => void;
}

/**
 * Drive the generate → verify → render loop. `difficulty` is read fresh for each
 * request (via a ref synced in an effect), so a difficulty change mid-problem
 * applies to the *next* problem instead of interrupting the current one.
 */
export function useInfinitePractice(
  difficulty: GenerationDifficulty,
): InfinitePracticeState {
  const [status, setStatus] = useState<PracticeStatus>("loading");
  const [problem, setProblem] = useState<ProblemStep | null>(null);
  const [kind, setKind] = useState<GeneratableInteractionKind | null>(null);
  const [token, setToken] = useState(0);

  const rotationRef = useRef(0);
  const seedRef = useRef(1);
  // Bumped per request so a stale in-flight cycle (StrictMode double-invoke or a
  // rapid `next()`) can detect it was superseded and drop its result.
  const requestRef = useRef(0);
  const difficultyRef = useRef(difficulty);

  // Keep the latest difficulty available to the (stable) fetch loop without
  // reloading the current problem whenever it changes.
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  // Async fetch loop. The first state update only happens AFTER an `await`, so
  // it never sets state synchronously inside the mount effect below.
  const fetchProblem = useCallback(async () => {
    const requestId = ++requestRef.current;

    for (let attempt = 0; attempt < MAX_CANDIDATES_PER_PROBLEM; attempt++) {
      const candidateKind = ROTATION[rotationRef.current % ROTATION.length];
      rotationRef.current += 1;
      const seed = seedRef.current++;

      const { ok, step } = await generateProblem({
        interactionKind: candidateKind,
        difficulty: difficultyRef.current,
        seed,
      });

      // A newer request started while we awaited: abandon this one quietly.
      if (requestRef.current !== requestId) return;

      if (ok && step) {
        const verdict = verifyGeneratedProblem(step);
        if (verdict.ok) {
          // P4: only a verified problem ever reaches state. Tag provenance so
          // the renderer / progress can tell it apart from authored content.
          setProblem({ ...step, source: "ai" });
          setKind(candidateKind);
          setToken((t) => t + 1);
          setStatus("ready");
          return;
        }
        if (import.meta.env.DEV) {
          console.warn(
            `[infinite-practice] rejected ${candidateKind} candidate:`,
            verdict.errors,
          );
        }
      }
    }

    // Exhausted our tries (e.g. backend off/unimplemented): surface the graceful
    // error state rather than a wrong or half-rendered problem.
    if (requestRef.current === requestId) setStatus("error");
  }, []);

  const next = useCallback(() => {
    setStatus("loading");
    setProblem(null);
    setKind(null);
    void fetchProblem();
  }, [fetchProblem]);

  useEffect(() => {
    void fetchProblem();
  }, [fetchProblem]);

  return { status, problem, kind, token, next };
}
