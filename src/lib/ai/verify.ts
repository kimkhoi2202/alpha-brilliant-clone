/**
 * Verification firewall (PRD-phase-2 §3.1, Principles P3 & P4: "verify
 * everything checkable" / "the AI never emits a wrong answer").
 *
 * Ground truth is the existing pure engine (`gradeStep` / `correctAnswer`) plus
 * `math.js`. The model only *proposes*; this code *decides*. Nothing AI-proposed
 * reaches the learner until it passes here. This module is read-only with
 * respect to the engine — it never changes Phase 1 grading behavior.
 */
import { evaluate } from "mathjs";

import { correctAnswer, gradeStep } from "../../content/engine";
import type { ProblemStep, TriangleSide, VisualSpec } from "../../content/types";

export interface VerificationResult {
  ok: boolean;
  /** Human-readable reasons it failed (empty when ok). */
  errors: string[];
}

/** The hand-built figure kinds (PRD §2.4: no AI-generated visuals). */
const KNOWN_VISUAL_KINDS: readonly VisualSpec["kind"][] = [
  "right-triangle",
  "coordinate-grid",
  "rearrangement-proof",
];

function isKnownVisualKind(kind: string): boolean {
  return (KNOWN_VISUAL_KINDS as readonly string[]).includes(kind);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Evaluate a numeric expression with `math.js`; NaN on any non-finite result. */
function evalNumber(expr: string, scope: Record<string, number>): number {
  try {
    const value: unknown = evaluate(expr, scope);
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

/** Minimal structural guard — AI output is cast to `ProblemStep` but untrusted. */
function isProblemStepShape(step: ProblemStep): boolean {
  return (
    typeof step === "object" &&
    step !== null &&
    step.kind === "problem" &&
    typeof step.prompt === "string" &&
    typeof step.interaction === "object" &&
    step.interaction !== null &&
    typeof step.interaction.kind === "string"
  );
}

/** Leg lengths from a triangle figure or triangle interaction, if present. */
function triangleLegs(step: ProblemStep): { a: number; b: number } | undefined {
  const { visual, interaction } = step;
  if (visual?.kind === "right-triangle" || visual?.kind === "rearrangement-proof") {
    return { a: visual.a, b: visual.b };
  }
  switch (interaction.kind) {
    case "pick-side":
    case "pick-sides":
    case "pick-angle":
    case "count-squares":
      return { a: interaction.a, b: interaction.b };
    default:
      return undefined;
  }
}

function isHypotenuseUnknown(
  visual: Extract<VisualSpec, { kind: "right-triangle" }>,
): boolean {
  return (
    visual.unknownHypotenuse === true ||
    visual.unknownSide === "c" ||
    visual.showHypotenuseValue === true
  );
}

/** Check numeric relationships (a²+b²=c², area counts) independently via math.js. */
function checkNumericRelationships(step: ProblemStep): string[] {
  const errors: string[] = [];
  const { interaction, visual } = step;

  const legs = triangleLegs(step);
  if (legs) {
    const { a, b } = legs;
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
      errors.push(`triangle legs must be positive finite numbers (a=${a}, b=${b})`);
      return errors; // downstream math would be meaningless
    }
  }

  // count-squares: recompute the cell count with math.js and compare to engine.
  if (interaction.kind === "count-squares") {
    const { a, b, countSide } = interaction;
    const expr =
      countSide === "a" ? "a^2" : countSide === "b" ? "b^2" : "a^2 + b^2";
    const expected = evalNumber(expr, { a, b });
    const answer = correctAnswer(interaction);
    if (answer.kind === "count-squares" && answer.value !== expected) {
      errors.push(
        `count-squares area mismatch: engine=${String(answer.value)} math.js=${expected}`,
      );
    }
  }

  // numeric answers must be INDEPENDENTLY re-derivable from verifiable givens —
  // we never pass on the generator's stated `answer`. The one numeric relationship
  // this course can recompute is the right-triangle hypotenuse √(a²+b²); a numeric
  // problem we cannot recompute that way fails closed (defense-in-depth: don't
  // trust the generator's goodwill).
  if (interaction.kind === "numeric") {
    if (visual?.kind === "right-triangle" && isHypotenuseUnknown(visual)) {
      const c = evalNumber("sqrt(a^2 + b^2)", { a: visual.a, b: visual.b });
      const tol = (interaction.tolerance ?? 0) + 1e-9;
      if (!Number.isFinite(c) || Math.abs(interaction.answer - c) > tol) {
        errors.push(
          `numeric hypotenuse mismatch: answer=${interaction.answer} expected≈${c}`,
        );
      }
    } else {
      errors.push(
        "numeric answer not independently verifiable: no right-triangle legs to recompute from",
      );
    }
  }

  return errors;
}

/**
 * Verify an AI-proposed problem. It is `ok` only if, all together:
 *  1. the engine grades our computed `correctAnswer` as "correct" (round-trip),
 *  2. any visual references an existing hand-built `VisualSpec` kind, and
 *  3. its numeric relationships check out via `math.js`.
 */
export function verifyGeneratedProblem(step: ProblemStep): VerificationResult {
  if (!isProblemStepShape(step)) {
    return {
      ok: false,
      errors: ["malformed problem step (missing kind/prompt/interaction)"],
    };
  }

  const errors: string[] = [];

  // (P4) Round-trip: gradeStep(correctAnswer(step)) must be "correct".
  try {
    const grade = gradeStep(step, correctAnswer(step.interaction));
    if (grade.status !== "correct") {
      errors.push("round-trip failed: gradeStep(correctAnswer(step)) is not 'correct'");
    }
  } catch (err) {
    errors.push(`round-trip threw: ${errorMessage(err)}`);
  }

  // Visual must be one of the hand-built kinds (no AI-authored figures).
  if (step.visual && !isKnownVisualKind(step.visual.kind)) {
    errors.push(`unknown visual kind: ${String(step.visual.kind)}`);
  }

  // Numeric relationships must check out via math.js.
  errors.push(...checkNumericRelationships(step));

  return { ok: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Hint leak detection — a hint must never contain the rendered correct answer.
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
