/**
 * AI-side answer rendering + a re-export of the deterministic diagnoser.
 *
 * The misconception *classifier* now lives below the AI line, next to the
 * grading engine (`src/content/diagnosis.ts`), so the static feedback can name a
 * mistake with AI off and Koji phrases over the identical diagnosis (SPOV 9).
 * This module re-exports it (so existing AI-tool imports are unchanged) and keeps
 * the AI-reveal-only helpers: rendering an `AnswerValue` and the engine-computed
 * worked solution.
 */
import { correctAnswer } from "../../../content/engine";
import {
  diagnoseMistake,
  triangleLegsOf,
  type MistakeDiagnosis,
} from "../../../content/diagnosis";
import type { AnswerValue, Interaction, ProblemStep } from "../../../content/types";

// One source of truth for "why wrong": re-exported from the content layer so AI
// tools (reveal / tutor) and the static feedback share the same diagnosis.
export { diagnoseMistake };
export type { MistakeDiagnosis };

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
  const legs = triangleLegsOf(step);

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
