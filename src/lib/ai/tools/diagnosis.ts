/**
 * Deterministic mistake diagnosis + answer rendering (PRD-phase-2 §4.1
 * "classify the mistake deterministically from `AnswerValue` vs
 * `correctAnswer()`", §2.3 "names the learner's specific gap").
 *
 * This is pure, engine-grounded logic: the *diagnosis* and the *worked answer*
 * are computed here from typed state, never by the model (P3/P4). `explainMiss`
 * and `revealSolution` use it as their ground truth; the model only phrases it.
 */
import { correctAnswer } from "../../../content/engine";
import type {
  AnswerValue,
  Interaction,
  ProblemStep,
} from "../../../content/types";

/** A deterministic read of *why* the learner's answer was wrong. */
export interface MistakeDiagnosis {
  /** Stable, machine-readable code (e.g. "added-legs"). */
  code: string;
  /** One-sentence, learner-facing summary of the gap. */
  summary: string;
}

/** Floating-point near-equality, with an optional extra tolerance. */
function near(a: number, b: number, tol = 0): boolean {
  return Math.abs(a - b) <= tol + 1e-6;
}

/** Leg lengths from a triangle figure or triangle interaction, if present. */
function legsOf(step: ProblemStep): { a: number; b: number } | null {
  const { visual, interaction } = step;
  if (visual && (visual.kind === "right-triangle" || visual.kind === "rearrangement-proof")) {
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
function diagnoseNumeric(step: ProblemStep, value: number): MistakeDiagnosis | null {
  const legs = legsOf(step);
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
          "You added the legs (a + b). The hypotenuse comes from a² + b² = c², not a + b.",
      };
    }
    if (near(value, sumOfSquares, tol)) {
      return {
        code: "forgot-square-root",
        summary:
          "You found a² + b², but stopped there — take the square root of that sum to get c.",
      };
    }
    if (diff > 0 && near(value, diff, tol)) {
      return {
        code: "subtracted-legs",
        summary:
          "You subtracted the legs. The hypotenuse uses a² + b², not a − b.",
      };
    }
  }

  if (step.interaction.kind === "count-squares" && step.interaction.countSide === "c") {
    const { a, b } = step.interaction;
    if (near(value, a * a) || near(value, b * b)) {
      return {
        code: "counted-one-square",
        summary:
          "You counted just one square. The big square's area is a² + b² — both squares together.",
      };
    }
  }

  return {
    code: "numeric-off",
    summary: "That value isn't right yet — recheck the arithmetic step by step.",
  };
}

/** Diagnose a triangle-side miss (picked a leg when the hypotenuse was wanted). */
function diagnosePickSide(step: ProblemStep, answer: AnswerValue): MistakeDiagnosis {
  const correct = correctAnswer(step.interaction);
  const wantsHypotenuse =
    (correct.kind === "pick-side" && correct.side === "c") ||
    (correct.kind === "pick-sides" && correct.sides.includes("c"));
  if (wantsHypotenuse) {
    const pickedLeg =
      (answer.kind === "pick-side" && answer.side !== "c") ||
      (answer.kind === "pick-sides" && answer.sides.some((s) => s !== "c"));
    if (pickedLeg) {
      return {
        code: "leg-not-hypotenuse",
        summary:
          "That's a leg. The hypotenuse is the longest side, opposite the right angle.",
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
 * explanation suitable as both an `explainMiss` fallback and the gap framing for
 * a `revealSolution`.
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

/** Render an `AnswerValue` as a short, human-readable string for display. */
export function formatAnswer(interaction: Interaction, answer: AnswerValue): string {
  switch (answer.kind) {
    case "numeric":
    case "slider": {
      if (answer.value === null) return "—";
      const unit =
        interaction.kind === "numeric" || interaction.kind === "slider"
          ? interaction.unit
          : undefined;
      return unit ? `${answer.value} ${unit}` : `${answer.value}`;
    }
    case "count-squares":
      return answer.value === null ? "—" : `${answer.value}`;
    case "multiple-choice": {
      if (answer.choiceId === null) return "—";
      if (interaction.kind === "multiple-choice") {
        const choice = interaction.choices.find((c) => c.id === answer.choiceId);
        if (choice) return choice.label;
      }
      return answer.choiceId;
    }
    case "multi-select": {
      if (interaction.kind === "multi-select") {
        const labels = answer.choiceIds.map(
          (id) => interaction.choices.find((c) => c.id === id)?.label ?? id,
        );
        return labels.length > 0 ? labels.join(", ") : "—";
      }
      return answer.choiceIds.join(", ") || "—";
    }
    case "tap-bar": {
      if (answer.barId === null) return "—";
      if (interaction.kind === "tap-bar") {
        const bar = interaction.bars.find((b) => b.id === answer.barId);
        if (bar) return bar.label;
      }
      return answer.barId;
    }
    case "tile-expression":
      return answer.filled.map((t) => t ?? "_").join(" ");
    case "pick-side":
      return answer.side ?? "—";
    case "pick-sides":
      return answer.sides.length > 0 ? answer.sides.join(", ") : "—";
    case "pick-angle":
      return answer.vertex ?? "—";
    case "plot-points":
      return answer.points.length > 0
        ? answer.points.map((p) => `(${p.x}, ${p.y})`).join(", ")
        : "—";
    case "categorize": {
      const pairs = Object.entries(answer.placement).map(
        ([item, bin]) => `${item} → ${bin ?? "_"}`,
      );
      return pairs.length > 0 ? pairs.join(", ") : "—";
    }
  }
}

/**
 * A short worked solution for the step's engine-computed answer. For the
 * Pythagorean numeric case it shows the a² + b² = c² working; otherwise it
 * states the correct answer plainly. Always derived from the engine (P4).
 */
export function workedSolution(step: ProblemStep): string {
  const answer = correctAnswer(step.interaction);
  const formatted = formatAnswer(step.interaction, answer);
  const legs = legsOf(step);

  if (
    step.interaction.kind === "numeric" &&
    answer.kind === "numeric" &&
    answer.value !== null &&
    legs
  ) {
    const { a, b } = legs;
    return `c = √(a² + b²) = √(${a}² + ${b}²) = √${a * a + b * b} = ${formatted}.`;
  }

  return `The correct answer is ${formatted}.`;
}
