/**
 * Client-side crash-prevention gate for generated practice (Phase 3).
 *
 * Owner-approved reversal of the previous "verification firewall": the MODEL now
 * authors the full problem and OWNS its correctness, so this no longer
 * re-derives answers or rejects a problem because its math looks wrong. What it
 * STILL does is keep the UI from white-screening: every generated / cached step
 * is checked to PARSE into a renderable interaction SHAPE (valid kind, required
 * fields present and well-typed, the answer key references real options/tiles)
 * before it is rendered. Anything malformed is dropped and the caller falls back.
 *
 * The `hintLeaksAnswer` helper below is unrelated to generation correctness — it
 * guards the live tutor/hint path and is unchanged.
 */
import { correctAnswer } from "../../content/engine";
import type { ProblemStep, TriangleSide, VisualSpec } from "../../content/types";

export interface VerificationResult {
  ok: boolean;
  /** Human-readable reasons it failed (empty when ok). */
  errors: string[];
}

/** The hand-built figure kinds the renderer supports (PRD §2.4: no AI visuals). */
const KNOWN_VISUAL_KINDS: readonly VisualSpec["kind"][] = [
  "right-triangle",
  "coordinate-grid",
  "rearrangement-proof",
];

function isKnownVisualKind(kind: string): boolean {
  return (KNOWN_VISUAL_KINDS as readonly string[]).includes(kind);
}

/** True for a finite, positive number (legs the figures can draw). */
function isFinitePositive(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Minimal structural guard — AI output is cast to `ProblemStep` but untrusted. */
function isProblemStepShape(step: ProblemStep): boolean {
  return (
    typeof step === "object" &&
    step !== null &&
    step.kind === "problem" &&
    typeof step.prompt === "string" &&
    step.prompt.length > 0 &&
    typeof step.interaction === "object" &&
    step.interaction !== null &&
    typeof step.interaction.kind === "string" &&
    typeof step.feedback === "object" &&
    step.feedback !== null &&
    typeof step.feedback.correct === "string" &&
    typeof step.feedback.default === "string"
  );
}

/** A present figure must be a known kind; a right-triangle needs positive legs. */
function figureErrors(visual: VisualSpec | undefined): string[] {
  if (!visual) return [];
  if (!isKnownVisualKind(visual.kind)) {
    return [`unknown visual kind: ${String(visual.kind)}`];
  }
  if (visual.kind === "right-triangle" || visual.kind === "rearrangement-proof") {
    if (!isFinitePositive(visual.a) || !isFinitePositive(visual.b)) {
      return [
        `right-triangle figure needs positive legs (a=${String(visual.a)}, b=${String(visual.b)})`,
      ];
    }
  }
  return [];
}

/**
 * Per-kind renderability checks for the five generated interaction kinds. These
 * verify the SHAPE is renderable and self-consistent enough to answer — NOT that
 * the math is right (that's the model's responsibility now).
 */
function interactionErrors(step: ProblemStep): string[] {
  const i = step.interaction;
  switch (i.kind) {
    case "numeric":
      return typeof i.answer === "number" && Number.isFinite(i.answer)
        ? []
        : [`numeric answer must be a finite number (got ${String(i.answer)})`];
    case "count-squares":
      if (!isFinitePositive(i.a) || !isFinitePositive(i.b)) {
        return ["count-squares needs positive legs"];
      }
      return ["a", "b", "c"].includes(i.countSide)
        ? []
        : [`invalid countSide: ${String(i.countSide)}`];
    case "pick-side":
      if (!isFinitePositive(i.a) || !isFinitePositive(i.b)) {
        return ["pick-side needs positive legs"];
      }
      return ["a", "b", "c"].includes(i.correctSide)
        ? []
        : [`invalid correctSide: ${String(i.correctSide)}`];
    case "multiple-choice": {
      if (!Array.isArray(i.choices) || i.choices.length < 2) {
        return ["multiple-choice needs at least two choices"];
      }
      if (!i.choices.every((c) => typeof c.id === "string" && typeof c.label === "string")) {
        return ["each multiple-choice option needs a string id and label"];
      }
      return i.choices.some((c) => c.id === i.correctChoiceId)
        ? []
        : ["correctChoiceId must reference one of the choices"];
    }
    case "tile-expression": {
      if (
        !Array.isArray(i.tiles) ||
        !Array.isArray(i.template) ||
        !Array.isArray(i.solution)
      ) {
        return ["tile-expression needs tiles, template, and solution arrays"];
      }
      const blanks = i.template.filter((t) => t === null).length;
      if (blanks !== i.solution.length) {
        return ["tile-expression blank count must equal solution length"];
      }
      return i.solution.every((tok) => i.tiles.includes(tok))
        ? []
        : ["every tile-expression solution token must be in the bank"];
    }
    default:
      // Generation only produces the five kinds above.
      return [`interaction kind is not a generatable/renderable kind: ${String(i.kind)}`];
  }
}

/**
 * Crash-prevention check for an AI-authored problem. It is `ok` only if the step
 * parses into a renderable interaction shape: a well-typed `ProblemStep`, any
 * figure is a known visual kind, and the interaction's required fields are
 * present and well-typed. It does NOT check correctness — the model owns that.
 */
export function verifyGeneratedProblem(step: ProblemStep): VerificationResult {
  if (!isProblemStepShape(step)) {
    return {
      ok: false,
      errors: ["malformed problem step (missing kind/prompt/interaction/feedback)"],
    };
  }

  const errors = [...figureErrors(step.visual), ...interactionErrors(step)];
  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Hint leak detection — a hint must never contain the rendered correct answer.
// (Unrelated to generation; guards the live tutor/hint path. Unchanged.)
// ---------------------------------------------------------------------------

const NUMBER_TOKEN = /^-?\d+(\.\d+)?$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if `token` appears in `haystack` as a standalone value (not a substring). */
function containsToken(haystack: string, token: string): boolean {
  const needle = token.toLowerCase().trim();
  if (needle.length === 0) return false;

  // Numbers: match the whole value, not a digit inside a larger number. The
  // trailing guard only blocks a following digit (not a dot), so a trailing
  // period ("it's 5.") still counts as a leak.
  if (NUMBER_TOKEN.test(needle)) {
    return new RegExp(`(?<![\\d.])${escapeRegExp(needle)}(?!\\d)`).test(haystack);
  }
  // Single letters (e.g. side "c"): match as a whole word only.
  if (needle.length === 1) {
    return new RegExp(`(?<!\\p{L})${escapeRegExp(needle)}(?!\\p{L})`, "u").test(
      haystack,
    );
  }
  return haystack.includes(needle);
}

function numberTokens(value: number, unit?: string): string[] {
  if (!Number.isFinite(value)) return [];
  const tokens = [String(value)];
  // Fixed-decimal renderings the model might use. Emitted for integers too
  // (answer 5 → "5.0" / "5.00"), so a hint like "it's 5.0 cm" is still caught.
  tokens.push(value.toFixed(1), value.toFixed(2));
  if (unit) {
    tokens.push(`${value} ${unit}`, `${value}${unit}`);
  }
  return tokens;
}

function pushSideName(
  tokens: string[],
  names: Partial<Record<TriangleSide, string>> | undefined,
  side: TriangleSide,
): void {
  const name = names?.[side];
  if (name) tokens.push(name);
}

/** Rendered forms of the correct answer, derived only from typed state. */
function answerTokens(step: ProblemStep): string[] {
  const { interaction } = step;
  const tokens: string[] = [];

  switch (interaction.kind) {
    case "multiple-choice": {
      const choice = interaction.choices.find(
        (c) => c.id === interaction.correctChoiceId,
      );
      if (choice) tokens.push(choice.label);
      break;
    }
    case "multi-select": {
      for (const id of interaction.correctChoiceIds) {
        const choice = interaction.choices.find((c) => c.id === id);
        if (choice) tokens.push(choice.label);
      }
      break;
    }
    case "tap-bar": {
      const bar = interaction.bars.find((b) => b.id === interaction.correctBarId);
      if (bar) tokens.push(bar.label);
      break;
    }
    case "numeric":
    case "slider":
      tokens.push(...numberTokens(interaction.answer, interaction.unit));
      break;
    case "count-squares": {
      const answer = correctAnswer(interaction);
      if (answer.kind === "count-squares" && answer.value !== null) {
        tokens.push(...numberTokens(answer.value));
      }
      break;
    }
    case "tile-expression":
      tokens.push(interaction.solution.join(" "), interaction.solution.join(""));
      for (const tile of interaction.solution) tokens.push(tile);
      break;
    case "pick-side":
      tokens.push(interaction.correctSide);
      pushSideName(tokens, interaction.sideNames, interaction.correctSide);
      break;
    case "pick-sides":
      for (const side of interaction.correctSides) {
        tokens.push(side);
        pushSideName(tokens, interaction.sideNames, side);
      }
      break;
    case "pick-angle": {
      tokens.push(interaction.correctVertex);
      const vertexName = interaction.vertexNames?.[interaction.correctVertex];
      if (vertexName) tokens.push(vertexName);
      break;
    }
    case "plot-points":
      for (const point of interaction.targets) {
        tokens.push(`(${point.x}, ${point.y})`, `(${point.x},${point.y})`);
      }
      break;
    case "categorize":
      // A placement map has no single leakable rendered phrase; nothing to add.
      break;
  }

  return tokens.filter((t) => t.trim().length > 0);
}

/**
 * Detect whether `hintText` leaks the step's rendered correct answer, so a hint
 * can be discarded (and the static fallback used) before it reaches the learner.
 * Conservative by design: a false positive only costs a fallback hint, while a
 * miss would show the answer — so we bias toward flagging.
 */
export function hintLeaksAnswer(hintText: string, step: ProblemStep): boolean {
  if (typeof hintText !== "string" || hintText.trim().length === 0) return false;
  const haystack = hintText.toLowerCase();
  return answerTokens(step).some((token) => containsToken(haystack, token));
}
