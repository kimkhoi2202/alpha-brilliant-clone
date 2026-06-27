/**
 * Feedback engine — VENDORED COPY for the Vercel `/api` serverless backend.
 *
 * A faithful mirror of `src/content/engine.ts`, ported verbatim from
 * `functions/src/content/engine.ts`. Pure and synchronous: the same
 * `gradeStep` / `correctAnswer` the client uses, so the server can run the
 * verification firewall (PRD §3.1, P3/P4) — a generated `ProblemStep` is only
 * returned to the browser after `gradeStep(step, correctAnswer(step.interaction))`
 * returns `"correct"`. Kept aligned with the client copy; do not diverge.
 */
import type {
  AnswerValue,
  Evaluation,
  Interaction,
  Lesson,
  ProblemStep,
} from "./types.js";

function withinTolerance(value: number, target: number, tol = 0): boolean {
  return Math.abs(value - target) <= tol;
}

/** A neutral starting answer for an interaction, used to seed player state. */
export function defaultAnswer(interaction: Interaction): AnswerValue {
  switch (interaction.kind) {
    case "multiple-choice":
      return { kind: "multiple-choice", choiceId: null };
    case "multi-select":
      return { kind: "multi-select", choiceIds: [] };
    case "categorize":
      return {
        kind: "categorize",
        placement: Object.fromEntries(
          interaction.items.map((item) => [item.id, null]),
        ),
      };
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
    case "pick-side":
      return { kind: "pick-side", side: null };
    case "pick-sides":
      return { kind: "pick-sides", sides: [] };
    case "pick-angle":
      return { kind: "pick-angle", vertex: null };
    case "count-squares":
      return { kind: "count-squares", value: null };
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
    case "multi-select":
      return answer.kind === "multi-select" && answer.choiceIds.length > 0;
    case "categorize":
      return (
        answer.kind === "categorize" &&
        interaction.items.every((item) => answer.placement[item.id] != null)
      );
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
    case "pick-side":
      return answer.kind === "pick-side" && answer.side !== null;
    case "pick-sides":
      return answer.kind === "pick-sides" && answer.sides.length > 0;
    case "pick-angle":
      return answer.kind === "pick-angle" && answer.vertex !== null;
    case "count-squares":
      return answer.kind === "count-squares" && answer.value !== null;
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

/** Unit-cell count of the counted square: a² for leg a, b² for leg b, a²+b² for the hypotenuse. */
function squareCellCount(
  i: Extract<Interaction, { kind: "count-squares" }>,
): number {
  if (i.countSide === "a") return i.a * i.a;
  if (i.countSide === "b") return i.b * i.b;
  return i.a * i.a + i.b * i.b;
}

/** Unordered set equality over string ids (for select-all-that-apply). */
function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function isCorrect(interaction: Interaction, answer: AnswerValue): boolean {
  switch (interaction.kind) {
    case "multiple-choice":
      return (
        answer.kind === "multiple-choice" &&
        answer.choiceId === interaction.correctChoiceId
      );
    case "multi-select":
      return (
        answer.kind === "multi-select" &&
        sameIdSet(answer.choiceIds, interaction.correctChoiceIds)
      );
    case "categorize":
      return (
        answer.kind === "categorize" &&
        interaction.items.every(
          (item) => answer.placement[item.id] === item.binId,
        )
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
    case "pick-side":
      return (
        answer.kind === "pick-side" && answer.side === interaction.correctSide
      );
    case "pick-sides":
      return (
        answer.kind === "pick-sides" &&
        sameIdSet(answer.sides, interaction.correctSides)
      );
    case "pick-angle":
      return (
        answer.kind === "pick-angle" && answer.vertex === interaction.correctVertex
      );
    case "count-squares":
      return (
        answer.kind === "count-squares" &&
        answer.value !== null &&
        answer.value === squareCellCount(interaction)
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
      // For select-all, a hint fires when its target id is among the chosen set.
      if (answer.kind === "multi-select" && answer.choiceIds.includes(rule.selectionId))
        return rule.hint;
      if (answer.kind === "pick-side" && answer.side === rule.selectionId)
        return rule.hint;
      if (answer.kind === "pick-sides" && answer.sides.some((s) => s === rule.selectionId))
        return rule.hint;
      if (answer.kind === "pick-angle" && answer.vertex === rule.selectionId)
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
      if (
        answer.kind === "count-squares" &&
        answer.value !== null &&
        withinTolerance(answer.value, rule.equals, 0)
      )
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
    case "multi-select":
      return { kind: "multi-select", choiceIds: interaction.correctChoiceIds.slice() };
    case "categorize":
      return {
        kind: "categorize",
        placement: Object.fromEntries(
          interaction.items.map((item) => [item.id, item.binId]),
        ),
      };
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
    case "pick-side":
      return { kind: "pick-side", side: interaction.correctSide };
    case "pick-sides":
      return { kind: "pick-sides", sides: interaction.correctSides.slice() };
    case "pick-angle":
      return { kind: "pick-angle", vertex: interaction.correctVertex };
    case "count-squares":
      return { kind: "count-squares", value: squareCellCount(interaction) };
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
