/**
 * Host provider that assembles a live `ToolContext` for the lesson player
 * (PRD-phase-2 §3.3). This is the bridge between React state and the
 * UI-framework-agnostic tool layer: it wires `useLearner()`, the router
 * `navigate`, the current step + its `buildGrounding` payload, the mascot
 * reaction handle, and a per-step engagement signal into the single `ToolContext`
 * every tool (`giveHint`, `explainMiss`, `revealSolution`, …) runs against.
 *
 * It is additive: it constructs the existing `ToolContext` shape and never
 * changes any tool's public API. Everything stays inert when AI is off —
 * `ToolContext.aiEnabled` mirrors `aiEnabled()`, so the tools no-op safely.
 *
 * Kept as a `.ts` module (hooks only, no JSX) so it sits naturally beside the
 * rest of the tool layer.
 */
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import type { AnswerValue, LessonId, Step } from "../../../content/types";
import { useLearner, type StepRecord } from "../../learner";
import { aiEnabled } from "../flag";
import type { LessonCanvas } from "./canvas";
import { createStepContext } from "./context";
import type { RevealAllowed } from "./reveal";
import type {
  EngagementSignal,
  KojiReactions,
  NavigationTarget,
  ToolContext,
} from "./registry";

// ---------------------------------------------------------------------------
// Engagement — the per-step "has the learner engaged Koji?" signal.
// ---------------------------------------------------------------------------

/**
 * A per-step engagement signal plus the reactive flags + reset the host needs.
 *
 * `signal` is the stable `EngagementSignal` handed to the `ToolContext` (its
 * `mark*` writers are called by `giveHint` / `explainMiss`; its `has*` readers
 * gate `revealSolution`). `usedHint` / `talkedToKoji` are the same facts exposed
 * as React state so the UI can re-render (e.g. unlock the reveal). `reset` clears
 * both — call it when the learner advances to a new step.
 */
export interface EngagementController {
  /** Stable signal handed to the `ToolContext`. Reads/writes are synchronous. */
  readonly signal: EngagementSignal;
  /** Reactive: a Koji hint/explanation has been delivered this step. */
  readonly usedHint: boolean;
  /** Reactive: the learner has conversed with Koji this step. */
  readonly talkedToKoji: boolean;
  /** Clear both flags (call on step change). */
  reset(): void;
}

/**
 * Maintain the per-step engagement signal as React state. The `signal` is
 * rebuilt whenever the flags change, so its `has*` readers always see the latest
 * committed value: tools `mark*` it in one call (a `setState`) and the reveal
 * reads it in a later call (after the re-render), which is exactly the
 * cross-call pattern the reveal gate needs. Backing it with state (not refs)
 * means `reset()` is a pure `setState` the host can call when the step changes,
 * keeping the gate from leaking engagement across steps.
 */
export function useEngagement(): EngagementController {
  const [usedHint, setUsedHint] = useState(false);
  const [talkedToKoji, setTalkedToKoji] = useState(false);

  const signal = useMemo<EngagementSignal>(
    () => ({
      hasUsedHint: () => usedHint,
      hasTalkedToKoji: () => talkedToKoji,
      markHintUsed: () => setUsedHint(true),
      markTalkedToKoji: () => setTalkedToKoji(true),
    }),
    [usedHint, talkedToKoji],
  );

  const reset = useCallback(() => {
    setUsedHint(false);
    setTalkedToKoji(false);
  }, []);

  return { signal, usedHint, talkedToKoji, reset };
}

// ---------------------------------------------------------------------------
// ToolContext — assembled from live lesson + learner + router state.
// ---------------------------------------------------------------------------

export interface UseToolContextInput {
  /** The lesson the current step belongs to. */
  lessonId: LessonId;
  /** The current step (concept or problem). */
  step: Step;
  /** The learner's in-progress answer for this step, or null. */
  answer: AnswerValue | null;
  /**
   * The learner's LIVE record for this step (attempts/hints from the player's
   * own state, NOT the persisted snapshot) so the reveal effort-gate and the
   * grounding's attempt count reflect the current attempt, not a stale write.
   */
  record: StepRecord | null;
  /** The mascot reaction handle, or null when no mascot is mounted. */
  koji: KojiReactions | null;
  /**
   * The lesson-canvas surface (visual ops delegate to the mounted interaction's
   * handle; `prefillAnswer` routes to the answer setter), or null when AI is off
   * or no interactive component is mounted. Pass a stable (memoized) value.
   */
  canvas: LessonCanvas | null;
  /** The per-step engagement signal (from `useEngagement`). */
  engagement: EngagementSignal;
  /**
   * Apply an unlocked reveal to the host UI (fill the answer + advance to
   * "revealed"). Lets a granted voice `revealSolution` reflect in the lesson,
   * matching the text panel's reveal. Pass a stable callback.
   */
  onReveal?: (result: RevealAllowed) => void;
}

/**
 * Assemble the `ToolContext` the lesson player's Koji tools run against. Reads
 * `useLearner()` for the learner API and `useNavigate()` for routing, and builds
 * the step context (with grounding) via `createStepContext` so grounding is
 * produced identically to every other surface (P2).
 */
export function useToolContext(input: UseToolContextInput): ToolContext {
  const { lessonId, step, answer, record, koji, canvas, engagement, onReveal } =
    input;
  const learner = useLearner();
  const navigate = useNavigate();
  const ai = aiEnabled();

  // Map UI-agnostic navigation targets onto the app's router so the tools layer
  // never imports a route type. Unknown-but-typed targets route best-effort.
  const navTo = useCallback(
    (target: NavigationTarget): void => {
      switch (target.to) {
        case "lesson":
          void navigate({
            to: "/lesson/$lessonId",
            params: { lessonId: target.lessonId },
          });
          return;
        case "course-map":
          void navigate({ to: "/" });
          return;
        case "infinite-practice":
          void navigate({ to: "/practice" });
          return;
        case "profile":
          void navigate({ to: "/profile" });
          return;
      }
    },
    [navigate],
  );

  const stepCtx = useMemo(
    () => createStepContext({ lessonId, step, answer, record }),
    [lessonId, step, answer, record],
  );

  return useMemo<ToolContext>(
    () => ({
      aiEnabled: ai,
      navigate: navTo,
      learner,
      step: stepCtx,
      koji,
      canvas,
      engagement,
      onReveal,
    }),
    [ai, navTo, learner, stepCtx, koji, canvas, engagement, onReveal],
  );
}
