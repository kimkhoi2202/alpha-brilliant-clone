/**
 * Read-state tool (PRD-phase-2 §3.3): `readState`.
 *
 * Koji's "look over the learner's shoulder" sense. It reads the learner's LIVE,
 * in-progress answer from `ToolContext.step` (what they've selected / typed /
 * plotted *right now*) plus a single whole-answer correct/incorrect flag from the
 * engine, so Koji can coach from where the learner actually is — not from a guess
 * or from the state at the start of the step.
 *
 * It is deliberately answer-safe (P4 — "the answer is earned, not free"):
 *  - It returns ONLY the learner's own current answer, rendered human-readably by
 *    `describeAnswer` (the inverse of `parseCanvasValue`), plus one boolean for
 *    whether the WHOLE answer is currently correct.
 *  - It NEVER returns the target value, never a per-part ("x right / y wrong")
 *    breakdown, and never `gradeStep`'s feedback message (which can name the
 *    answer). Reveals stay gated through `revealSolution`.
 *
 * No-op safe: when AI is off, there's no step, it's a concept (non-problem) step,
 * or nothing has been entered yet, it returns a benign "no current answer"
 * result instead of throwing — exactly like the canvas tools degrade when no
 * figure is mounted.
 */
import { z } from "zod";

import { gradeStep } from "../../../content/engine";
import type { AnswerValue, Interaction } from "../../../content/types";
import { defineTool } from "./registry";

/** Sentinel for "the learner hasn't entered anything yet" (no answer / blank). */
const NO_ANSWER_YET = "nothing yet";

/**
 * Join a small list into an English phrase: "a", "a and b", "a, b, and c".
 * Used so a multi-part pick reads naturally ("sides a and b").
 */
function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Human-readable description of the learner's CURRENT answer — the INVERSE of
 * `parseCanvasValue` (canvas.ts), with one `switch` over every interaction kind:
 *
 *   numeric / slider / count-squares → the number ("5")
 *   pick-side                        → "side c"
 *   pick-sides                       → "sides a and b"
 *   pick-angle                       → "angle A"
 *   multiple-choice / tap-bar        → the chosen option's label
 *   multi-select                     → the chosen labels, comma-separated
 *   tile-expression                  → the filled blanks ("a², b², c²")
 *   plot-points                      → the placed points ("(3, 4); (1, 2)")
 *   categorize                       → the item→bin mapping
 *
 * Returns `NO_ANSWER_YET` for an empty / default answer (nothing selected, no
 * number typed, no point plotted, …). It reads ONLY the learner's answer plus the
 * interaction's visible option labels — never any `correct*`/target field — so it
 * can never leak the answer. Mirrors the discriminate-on-`answer.kind` /
 * narrow-on-`interaction.kind` pattern in `formatAnswer` (diagnosis.ts).
 */
export function describeAnswer(
  interaction: Interaction,
  answer: AnswerValue,
): string {
  switch (answer.kind) {
    case "numeric":
    case "slider":
      return answer.value === null ? NO_ANSWER_YET : `${answer.value}`;
    case "count-squares":
      return answer.value === null ? NO_ANSWER_YET : `${answer.value}`;
    case "pick-side":
      return answer.side === null ? NO_ANSWER_YET : `side ${answer.side}`;
    case "pick-sides": {
      if (answer.sides.length === 0) return NO_ANSWER_YET;
      const word = answer.sides.length === 1 ? "side" : "sides";
      return `${word} ${joinWithAnd(answer.sides)}`;
    }
    case "pick-angle":
      return answer.vertex === null ? NO_ANSWER_YET : `angle ${answer.vertex}`;
    case "multiple-choice": {
      if (answer.choiceId === null) return NO_ANSWER_YET;
      if (interaction.kind === "multiple-choice") {
        const choice = interaction.choices.find((c) => c.id === answer.choiceId);
        if (choice) return choice.label;
      }
      return answer.choiceId;
    }
    case "multi-select": {
      if (answer.choiceIds.length === 0) return NO_ANSWER_YET;
      const labels = answer.choiceIds.map((id) =>
        interaction.kind === "multi-select"
          ? (interaction.choices.find((c) => c.id === id)?.label ?? id)
          : id,
      );
      return labels.join(", ");
    }
    case "tap-bar": {
      if (answer.barId === null) return NO_ANSWER_YET;
      if (interaction.kind === "tap-bar") {
        const bar = interaction.bars.find((b) => b.id === answer.barId);
        if (bar) return bar.label;
      }
      return answer.barId;
    }
    case "tile-expression": {
      if (answer.filled.every((t) => t === null)) return NO_ANSWER_YET;
      return answer.filled.map((t) => t ?? "_").join(", ");
    }
    case "plot-points":
      return answer.points.length === 0
        ? NO_ANSWER_YET
        : answer.points.map((p) => `(${p.x}, ${p.y})`).join("; ");
    case "categorize": {
      const placed = Object.entries(answer.placement).filter(
        ([, bin]) => bin !== null,
      );
      if (placed.length === 0) return NO_ANSWER_YET;
      return placed
        .map(([itemId, binId]) => {
          const itemLabel =
            interaction.kind === "categorize"
              ? (interaction.items.find((i) => i.id === itemId)?.label ?? itemId)
              : itemId;
          const binLabel =
            interaction.kind === "categorize"
              ? (interaction.bins.find((b) => b.id === binId)?.label ??
                binId ??
                "")
              : (binId ?? "");
          return `${itemLabel} → ${binLabel}`;
        })
        .join(", ");
    }
  }
}

/**
 * The learner's current answer + whether the whole thing is right yet.
 *  - `ok`        false only when there's no live problem to read (AI off,
 *                no step, or a concept/reading step).
 *  - `hasAnswer` true once the learner has actually entered something (vs. a
 *                blank / default answer Koji shouldn't coach off of).
 *  - `answer`    human-readable rendering of their CURRENT answer (their own
 *                input only — never the target), or "nothing yet".
 *  - `correct`   the WHOLE-answer engine flag (no per-part breakdown, no message,
 *                no target).
 *  - `reason`    why the tool is inert, when `ok` is false.
 */
export interface ReadStateResult {
  ok: boolean;
  hasAnswer: boolean;
  answer: string;
  correct: boolean;
  reason?: string;
}

export const readState = defineTool({
  name: "readState",
  description:
    "Read the learner's CURRENT in-progress answer to this problem (what they've selected, typed, or " +
    "plotted right now) and whether the whole answer is correct yet, so you can coach from where they " +
    "actually are. It returns only their own answer plus a single correct/incorrect flag — never the " +
    "target value and never which specific part is right or wrong. Reveal stays gated through revealSolution.",
  parameters: z.object({}),
  handler: (_args, ctx): ReadStateResult => {
    const inert = (reason: string): ReadStateResult => ({
      ok: false,
      hasAnswer: false,
      answer: NO_ANSWER_YET,
      correct: false,
      reason,
    });

    if (!ctx.aiEnabled) return inert("Koji's coaching is off right now.");
    const stepCtx = ctx.step;
    if (!stepCtx) return inert("The learner isn't on a problem right now.");
    const step = stepCtx.step;
    if (step.kind !== "problem") {
      return inert("This is a reading step, not a graded problem.");
    }

    const raw = stepCtx.answer;
    const answer = raw ? describeAnswer(step.interaction, raw) : NO_ANSWER_YET;
    const hasAnswer = answer !== NO_ANSWER_YET;
    // Whole-answer flag only — gradeStep's message can name the answer, so it is
    // deliberately discarded; we keep just the boolean status.
    const correct = raw !== null && gradeStep(step, raw).status === "correct";

    return { ok: true, hasAnswer, answer, correct };
  },
});
