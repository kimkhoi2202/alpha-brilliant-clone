/**
 * Voice tool binding (PRD-phase-2 §3.2 "tools execute in the browser" / §3.3).
 *
 * Adapts every typed `AppTool` in the shared `appTools` catalog into an
 * `@openai/agents-realtime` function tool so Koji can navigate, hint, explain,
 * generate practice, set difficulty, read progress, reveal, and celebrate by
 * voice — the *same* catalog the text agent uses, against the *same* live
 * `ToolContext`. The model only ever sees the tool name/description/Zod schema;
 * our handler runs the real logic locally with the current context.
 *
 * The realtime `tool()` validates the model's arguments against each tool's Zod
 * schema before our handler runs, and (in strict mode) transparently maps
 * optional fields to nullable for the model — so the existing schemas work as-is.
 *
 * Results are summarized to a compact string for the model to read back. Two
 * safety rules apply here (defense-in-depth, matching the Koji text panel):
 *  - `giveHint` / `explainMiss`: AI-phrased text that leaks the engine answer is
 *    swapped for the static fallback before it can be spoken (W1).
 *  - `generatePractice`: only counts are returned (the verified problems surface
 *    through the app UI, not the spoken channel).
 */
import { tool } from "@openai/agents-realtime";
import type { z } from "zod";

import type { ProblemStep } from "../../../content/types";
import { hintLeaksAnswer } from "../verify";
import { asRecord } from "../json";
import {
  appTools,
  staticHint,
  type AnyAppTool,
  type RevealAllowed,
  type ToolContext,
} from "../tools";

/** Cap the JSON we hand back to the model so a big result can't bloat the turn. */
const MAX_RESULT_CHARS = 1200;

function safeJson(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (typeof json !== "string") return "{}";
    return json.length > MAX_RESULT_CHARS ? json.slice(0, MAX_RESULT_CHARS) : json;
  } catch {
    return "{}";
  }
}

/** The current problem step, or null when the learner isn't on one. */
function currentProblem(ctx: ToolContext): ProblemStep | null {
  return ctx.step?.step.kind === "problem" ? ctx.step.step : null;
}

/**
 * Turn a tool's typed result into the compact string the model reads back, with
 * the hint-leak and generation trims described in the module header.
 */
export function summarizeToolResult(
  name: string,
  result: unknown,
  ctx: ToolContext,
): string {
  if (name === "generatePractice") {
    const rec = asRecord(result);
    if (rec) {
      return safeJson({
        ok: rec.ok,
        accepted: rec.accepted,
        rejected: rec.rejected,
        requested: rec.requested,
        difficulty: rec.difficulty,
        interactionKind: rec.interactionKind,
        reason: rec.reason,
      });
    }
  }

  if (name === "giveHint" || name === "explainMiss") {
    const rec = asRecord(result);
    const problem = currentProblem(ctx);
    if (
      rec &&
      problem &&
      rec.source === "ai" &&
      typeof rec.text === "string" &&
      hintLeaksAnswer(rec.text, problem)
    ) {
      const fallback =
        name === "giveHint"
          ? staticHint(problem, ctx.step?.answer ?? null)
          : ((asRecord(rec.diagnosis)?.summary as string | undefined) ??
            problem.feedback.default);
      return safeJson({ ...rec, text: fallback, source: "static", leakBlocked: true });
    }
  }

  return safeJson(result);
}

/**
 * A granted voice `revealSolution` must update the lesson UI exactly like the
 * text panel's `applyReveal` — fill the engine answer + advance to "revealed" —
 * so the screen doesn't stay stuck on "wrong" after Koji reveals by voice. The
 * tool has already recorded the step `assisted`; this just reflects it in the UI.
 */
function applyRevealToHost(name: string, result: unknown, ctx: ToolContext): void {
  if (name !== "revealSolution" || !ctx.onReveal) return;
  const rec = asRecord(result);
  if (rec?.allowed === true) ctx.onReveal(result as RevealAllowed);
}

/** Adapt one `AppTool` into a realtime function tool bound to the live context. */
function toRealtimeTool(appTool: AnyAppTool, getContext: () => ToolContext) {
  return tool({
    name: appTool.name,
    description: appTool.description,
    // Every §3.3 tool declares a Zod object schema; the SDK validates the model's
    // arguments against it before `execute` runs.
    parameters: appTool.parameters as z.ZodObject,
    strict: true,
    execute: async (input: unknown): Promise<string> => {
      const ctx = getContext();
      const result = await appTool.handler(input, ctx);
      // Mirror a granted reveal into the lesson UI (voice parity with the text panel).
      applyRevealToHost(appTool.name, result, ctx);
      return summarizeToolResult(appTool.name, result, ctx);
    },
  });
}

/**
 * Build the realtime tool set from the shared `appTools` catalog. `getContext`
 * is read on every call so tools always act on the learner's current
 * step/answer/engagement, even though the voice session is created once.
 */
export function buildRealtimeTools(getContext: () => ToolContext) {
  return (appTools as readonly AnyAppTool[]).map((appTool) =>
    toRealtimeTool(appTool, getContext),
  );
}
