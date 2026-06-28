/**
 * Deterministic misconception diagnosis (Phase 3, SPOV 9).
 *
 * Moved *below the AI line*: this pure classifier lives next to the grading
 * engine so the hand-authored static feedback can name a learner's specific
 * mistake **with AI off** — and so Koji (AI on) phrases warmly over the *same*
 * diagnosis, one source of truth for "why wrong" (the AI tools re-export from
 * here). It is computed from typed state, never the model, and is **answer-free
 * by construction** (it teaches the principle, never the value — SPOV 3).
 */
import type { AnswerValue, ProblemStep } from "./types";

/** A deterministic read of *why* the learner's answer was wrong. */
export interface MistakeDiagnosis {
  /** Stable, machine-readable code (e.g. "added-legs"). */
  code: string;
  /** One-sentence, learner-facing summary (what you did → why → the principle). */
  summary: string;
}

/** Floating-point near-equality, with an optional extra tolerance. */
function near(a: number, b: number, tol = 0): boolean {
  return Math.abs(a - b) <= tol + 1e-6;
}

/** Leg lengths from a triangle figure or triangle interaction, if present. */
export function triangleLegsOf(
  step: ProblemStep,
): { a: number; b: number } | null {
  const { visual, interaction } = step;
  if (
    visual &&
    (visual.kind === "right-triangle" || visual.kind === "rearrangement-proof")
  ) {
    return { a: visual.a, b: visual.b };
  }
  switch (interaction.kind) {
    case "pick-side":
    case "pick-sides":
    case "pick-angle":
    case "count-squares":
      return { a: interaction.a, b: interaction.b };
    default:
      return null;
  }
}

function numericValue(answer: AnswerValue): number | null {
  if (answer.kind === "numeric" || answer.kind === "slider") return answer.value;
  if (answer.kind === "count-squares") return answer.value;
  return null;
}

/** Diagnose a numeric / count miss against the Pythagorean relationships. */
function diagnoseNumeric(
  step: ProblemStep,
  value: number,
): MistakeDiagnosis | null {
  const legs = triangleLegsOf(step);
  const { interaction } = step;
  const tol =
    interaction.kind === "numeric" || interaction.kind === "slider"
      ? interaction.tolerance ?? 0
      : 0;

  if (legs) {
    const { a, b } = legs;
    const sum = a + b;
    const sumOfSquares = a * a + b * b;
    const diff = Math.abs(a - b);

    if (near(value, sum, tol)) {
      return {
        code: "added-legs",
        summary:
          "You added the legs (a + b). The hypotenuse comes from a² + b² = c², not a + b — square each leg first.",
      };
    }
    if (near(value, sumOfSquares, tol)) {
      return {
        code: "forgot-square-root",
        summary:
          "You found a² + b², but stopped one step early — that sum is c², so take its square root to get c.",
      };
    }
    if (diff > 0 && near(value, diff, tol)) {
      return {
        code: "subtracted-legs",
        summary:
          "You subtracted the legs. The hypotenuse uses a² + b² (squares added), not a − b.",
      };
    }
  }

  if (
    step.interaction.kind === "count-squares" &&
    step.interaction.countSide === "c"
  ) {
    const { a, b } = step.interaction;
    if (near(value, a * a) || near(value, b * b)) {
      return {
        code: "counted-one-square",
        summary:
          "You counted just one leg's square. The big (hypotenuse) square's area is a² + b² — both leg squares together.",
      };
    }
  }

  return {
    code: "numeric-off",
    summary: "That value isn't right yet — recheck the arithmetic step by step.",
  };
}

/** Diagnose a triangle-side miss (picked a leg when the hypotenuse was wanted). */
function diagnosePickSide(
  step: ProblemStep,
  answer: AnswerValue,
): MistakeDiagnosis {
  const i = step.interaction;
  const wantsHypotenuse =
    (i.kind === "pick-side" && i.correctSide === "c") ||
    (i.kind === "pick-sides" && i.correctSides.includes("c"));
  if (wantsHypotenuse) {
    const pickedLeg =
      (answer.kind === "pick-side" && answer.side !== null && answer.side !== "c") ||
      (answer.kind === "pick-sides" && answer.sides.some((s) => s !== "c"));
    if (pickedLeg) {
      return {
        code: "leg-not-hypotenuse",
        summary:
          "That's a leg — one of the two sides that form the right angle. The hypotenuse is the longest side, lying opposite the right angle.",
      };
    }
  }
  return {
    code: "wrong-side",
    summary: "That isn't the side being asked for — check the figure again.",
  };
}

/**
 * Classify the learner's wrong answer deterministically. Returns a
 * `MistakeDiagnosis` whose `summary` is a self-contained, answer-free
 * explanation suitable both as static feedback and as the gap framing for a
 * `revealSolution`.
 */
export function diagnoseMistake(
  step: ProblemStep,
  learnerAnswer: AnswerValue | null,
): MistakeDiagnosis {
  if (!learnerAnswer) {
    return {
      code: "no-attempt",
      summary: "There's no answer to diagnose yet — give the problem a try first.",
    };
  }

  const value = numericValue(learnerAnswer);
  if (value !== null) {
    const numeric = diagnoseNumeric(step, value);
    if (numeric) return numeric;
  }

  switch (step.interaction.kind) {
    case "pick-side":
    case "pick-sides":
      return diagnosePickSide(step, learnerAnswer);
    case "multiple-choice":
    case "multi-select":
    case "tap-bar":
      return {
        code: "wrong-choice",
        summary:
          "That choice isn't right — compare each option against a² + b² = c².",
      };
    default:
      return {
        code: "general",
        summary: "That wasn't right — let's walk through it together.",
      };
  }
}

// Codes whose diagnosis names a *specific*, characterizable misconception. The
// generic fallbacks (numeric-off / wrong-choice / wrong-side / general /
// no-attempt) are NOT here: for those the hand-authored `feedback.default` reads
// better than a bland diagnosis.
const NAMED_MISCONCEPTIONS = new Set([
  "added-legs",
  "forgot-square-root",
  "subtracted-legs",
  "counted-one-square",
  "leg-not-hypotenuse",
]);

/** A retry nudge — encouraging, method-oriented, and answer-free. */
const RETRY_NUDGE = "Re-work it with that in mind, then check again.";

/**
 * Static, AI-off explanatory feedback for a wrong answer: when the deterministic
 * classifier recognizes a *named* misconception, return the structured
 * explanation (what you did → why it's wrong → the principle → a nudge to retry,
 * never the answer). Otherwise return null so the caller falls back to the
 * step's hand-authored `default`.
 */
export function misconceptionFeedback(
  step: ProblemStep,
  answer: AnswerValue | null,
): string | null {
  if (!answer) return null;
  const diagnosis = diagnoseMistake(step, answer);
  if (!NAMED_MISCONCEPTIONS.has(diagnosis.code)) return null;
  return `${diagnosis.summary} ${RETRY_NUDGE}`;
}
