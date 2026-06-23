/**
 * Feedback engine — pure, synchronous, client-side (PRD §4.1).
 * Correctness is derived from the interaction config + the learner's answer,
 * so feedback is instant (< 100ms) and never hits the network.
 */
import type {
  AnswerValue,
  Evaluation,
  Interaction,
  Lesson,
  ProblemStep,
} from "./types";

function withinTolerance(value: number, target: number, tol = 0): boolean {
  return Math.abs(value - target) <= tol;
}

/** A neutral starting answer for an interaction, used to seed player state. */
export function defaultAnswer(interaction: Interaction): AnswerValue {
  switch (interaction.kind) {
    case "multiple-choice":
      return { kind: "multiple-choice", choiceId: null };
    case "numeric":
      return { kind: "numeric", value: null };
    case "slider":
      return { kind: "slider", value: interaction.min };
    case "plot-points":
      return { kind: "plot-points", points: [] };
    case "tap-bar":
      return { kind: "tap-bar", barId: null };
    case "tile-expression":
      return {
        kind: "tile-expression",
        filled: Array.from(
          { length: interaction.template.filter((t) => t === null).length },
          () => null,
        ),
      };
  }
}

/** Whether the learner has supplied enough to grade (enables "Check"). */
export function isAnswerProvided(
  interaction: Interaction,
  answer: AnswerValue,
): boolean {
  switch (interaction.kind) {
    case "multiple-choice":
      return answer.kind === "multiple-choice" && answer.choiceId !== null;
    case "numeric":
      return answer.kind === "numeric" && answer.value !== null;
    case "slider":
      return true;
    case "plot-points":
      return (
        answer.kind === "plot-points" &&
        answer.points.length === interaction.targets.length
      );
    case "tap-bar":
      return answer.kind === "tap-bar" && answer.barId !== null;
    case "tile-expression":
      return (
        answer.kind === "tile-expression" &&
        answer.filled.every((t) => t !== null)
      );
  }
}

function pointsMatch(
  placed: { x: number; y: number }[],
  targets: { x: number; y: number }[],
): boolean {
  if (placed.length !== targets.length) return false;
  const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;
  const placedSet = new Set(placed.map(key));
  return targets.every((t) => placedSet.has(key(t)));
}

function isCorrect(interaction: Interaction, answer: AnswerValue): boolean {
  switch (interaction.kind) {
    case "multiple-choice":
      return (
        answer.kind === "multiple-choice" &&
        answer.choiceId === interaction.correctChoiceId
      );
    case "numeric":
      return (
        answer.kind === "numeric" &&
        answer.value !== null &&
        withinTolerance(answer.value, interaction.answer, interaction.tolerance)
      );
    case "slider":
      return (
        answer.kind === "slider" &&
        withinTolerance(answer.value, interaction.answer, interaction.tolerance)
      );
    case "plot-points":
      return (
        answer.kind === "plot-points" &&
        pointsMatch(answer.points, interaction.targets)
      );
    case "tap-bar":
      return answer.kind === "tap-bar" && answer.barId === interaction.correctBarId;
    case "tile-expression":
      return (
        answer.kind === "tile-expression" &&
        answer.filled.length === interaction.solution.length &&
        answer.filled.every((t, i) => t === interaction.solution[i])
      );
  }
}

/** Pick the targeted hint for a wrong answer, falling back to `default`. */
function pickHint(step: ProblemStep, answer: AnswerValue): string {
  const { hints, default: fallback } = step.feedback;
  if (!hints) return fallback;
  const { interaction } = step;

  for (const rule of hints) {
    if (rule.selectionId !== undefined) {
      if (answer.kind === "multiple-choice" && answer.choiceId === rule.selectionId)
        return rule.hint;
      if (answer.kind === "tap-bar" && answer.barId === rule.selectionId)
        return rule.hint;
    }
    if (rule.equals !== undefined) {
      const tol =
        interaction.kind === "numeric" || interaction.kind === "slider"
          ? interaction.tolerance
          : 0;
      if (answer.kind === "numeric" && answer.value !== null && withinTolerance(answer.value, rule.equals, tol))
        return rule.hint;
      if (answer.kind === "slider" && withinTolerance(answer.value, rule.equals, tol))
        return rule.hint;
    }
  }
  return fallback;
}

/** The fully-correct answer for an interaction (used by "See answer"). */
export function correctAnswer(interaction: Interaction): AnswerValue {
  switch (interaction.kind) {
    case "multiple-choice":
      return { kind: "multiple-choice", choiceId: interaction.correctChoiceId };
    case "numeric":
      return { kind: "numeric", value: interaction.answer };
    case "slider":
      return { kind: "slider", value: interaction.answer };
    case "plot-points":
      return { kind: "plot-points", points: interaction.targets };
    case "tap-bar":
      return { kind: "tap-bar", barId: interaction.correctBarId };
    case "tile-expression":
      return { kind: "tile-expression", filled: interaction.solution.slice() };
  }
}

/** Grade a problem step against the learner's answer. */
export function gradeStep(step: ProblemStep, answer: AnswerValue): Evaluation {
  if (isCorrect(step.interaction, answer)) {
    return { status: "correct", message: step.feedback.correct };
  }
  return { status: "incorrect", message: pickHint(step, answer) };
}

/** Total XP available in a lesson (sum of problem-step XP, default 15 each). */
export function lessonXp(lesson: Lesson): number {
  return lesson.steps.reduce(
    (sum, step) => (step.kind === "problem" ? sum + (step.xp ?? 15) : sum),
    0,
  );
}

/** Count of gradeable (problem) steps in a lesson. */
export function problemCount(lesson: Lesson): number {
  return lesson.steps.filter((s) => s.kind === "problem").length;
}
