/**
 * Grounding-payload builder (PRD-phase-2 Principle P2: "ground in structured
 * state, not raw text").
 *
 * `buildGrounding` turns the lesson's *typed* state — the current `ProblemStep`,
 * the learner's `AnswerValue`, and their `StepRecord` — into a small, JSON-safe
 * object for the tutor callable. It is built ONLY from typed content/progress
 * state: never from rendered DOM, KaTeX, or screen text. The engine-computed
 * `correctAnswer` is included so the model never has to compute a fact itself
 * (P3); the server post-checks any hint so it doesn't leak that answer (P4).
 */
import { correctAnswer } from "../../content/engine";
import type {
  AnswerValue,
  Choice,
  Interaction,
  InteractionKind,
  ProblemStep,
  TriangleOrientation,
  VisualSpec,
} from "../../content/types";
import type { StepRecord } from "../learner";

/** Course concept tag. The whole app is the Pythagorean theorem (course.ts). */
const COURSE_CONCEPT = "pythagorean-theorem";

/** Right-triangle givens, when the step has a triangle figure or interaction. */
export interface TriangleGivens {
  a: number;
  b: number;
  orientation?: TriangleOrientation;
  unit?: string;
}

/**
 * The structured facts that define the problem, by interaction kind. Note this
 * deliberately omits *which* option/side/value is correct — that lives in
 * `Grounding.correctAnswer` — so `givens` describes the question, not the key.
 */
export interface GroundingGivens {
  /** Leg lengths when the step is triangle-based (figure or interaction). */
  triangle?: TriangleGivens;
  /** The figure the learner sees, if any. */
  visualKind?: VisualSpec["kind"];
  /** Selectable options for choice interactions (ids + labels). */
  choices?: Choice[];
  /** Unit / tolerance metadata for numeric & slider answers. */
  numeric?: { unit?: string; tolerance?: number };
  /** Tile bank + expression template for tile-expression. */
  tiles?: { bank: readonly string[]; template: readonly (string | null)[] };
}

/** The compact, typed payload handed to the tutor (runTutor / generateProblem). */
export interface Grounding {
  /** Concept tag (e.g. "pythagorean-theorem"). */
  concept: string;
  /** The step's authored prompt (typed content, not scraped text). */
  prompt: string;
  /** Interaction discriminant ("numeric", "pick-side", …). */
  interactionKind: InteractionKind;
  /** Structured givens that define the question. */
  givens: GroundingGivens;
  /** Engine-computed correct answer, so the model never computes a fact (P3). */
  correctAnswer: AnswerValue;
  /** Human-readable correct answer (for the tutor prompt + server leak check). */
  correctAnswerText: string;
  /** The learner's current answer, or null if they haven't answered yet. */
  learnerAnswer: AnswerValue | null;
  /** Human-readable learner answer, or null if unanswered. */
  learnerAnswerText: string | null;
  /** Attempts recorded on this step so far (drives progressive hinting). */
  attemptNumber: number;
  /** Whether the learner has already used a hint on this step. */
  priorHints: boolean;
}

/** Pull leg lengths (and orientation/unit when known) from typed state. */
function triangleGivens(step: ProblemStep): TriangleGivens | undefined {
  const { visual, interaction } = step;
  if (visual?.kind === "right-triangle") {
    return { a: visual.a, b: visual.b, unit: visual.unit };
  }
  if (visual?.kind === "rearrangement-proof") {
    return { a: visual.a, b: visual.b };
  }
  switch (interaction.kind) {
    case "pick-side":
    case "pick-sides":
      return {
        a: interaction.a,
        b: interaction.b,
        orientation: interaction.orientation,
      };
    case "pick-angle":
    case "count-squares":
      return { a: interaction.a, b: interaction.b };
    default:
      return undefined;
  }
}

/** Build the per-kind `givens` block from the interaction + visual. */
function buildGivens(step: ProblemStep): GroundingGivens {
  const { interaction, visual } = step;
  const givens: GroundingGivens = {};

  const triangle = triangleGivens(step);
  if (triangle) givens.triangle = triangle;
  if (visual) givens.visualKind = visual.kind;

  switch (interaction.kind) {
    case "multiple-choice":
    case "multi-select":
      givens.choices = interaction.choices;
      break;
    case "numeric":
    case "slider":
      givens.numeric = {
        unit: interaction.unit,
        tolerance: interaction.tolerance,
      };
      break;
    case "tile-expression":
      givens.tiles = { bank: interaction.tiles, template: interaction.template };
      break;
    default:
      break;
  }

  return givens;
}

/**
 * Render an answer as human-readable text (labels, side names, value+unit) using
 * the interaction for context. Used so the tutor never receives opaque ids and
 * the server's answer-leak check has the real rendered value to look for (W1).
 */
function renderAnswer(interaction: Interaction, av: AnswerValue | null): string | null {
  if (!av) return null;
  switch (av.kind) {
    case "numeric":
    case "slider": {
      if (av.value === null) return null;
      const unit =
        interaction.kind === "numeric" || interaction.kind === "slider"
          ? interaction.unit
          : undefined;
      return unit ? `${av.value} ${unit}` : String(av.value);
    }
    case "count-squares":
      return av.value === null ? null : String(av.value);
    case "multiple-choice": {
      if (av.choiceId === null) return null;
      if (interaction.kind === "multiple-choice") {
        return (
          interaction.choices.find((c) => c.id === av.choiceId)?.label ?? av.choiceId
        );
      }
      return av.choiceId;
    }
    case "multi-select": {
      if (interaction.kind === "multi-select") {
        return av.choiceIds
          .map((id) => interaction.choices.find((c) => c.id === id)?.label ?? id)
          .join(", ");
      }
      return av.choiceIds.join(", ");
    }
    case "tap-bar": {
      if (av.barId === null) return null;
      if (interaction.kind === "tap-bar") {
        return interaction.bars.find((bar) => bar.id === av.barId)?.label ?? av.barId;
      }
      return av.barId;
    }
    case "pick-side": {
      if (av.side === null) return null;
      const name =
        interaction.kind === "pick-side" ? interaction.sideNames?.[av.side] : undefined;
      return name ?? `the ${av.side} side`;
    }
    case "pick-sides": {
      return av.sides
        .map((s) =>
          interaction.kind === "pick-sides"
            ? interaction.sideNames?.[s] ?? `the ${s} side`
            : `the ${s} side`,
        )
        .join(", ");
    }
    case "pick-angle": {
      if (av.vertex === null) return null;
      const name =
        interaction.kind === "pick-angle"
          ? interaction.vertexNames?.[av.vertex]
          : undefined;
      return name ?? `vertex ${av.vertex}`;
    }
    case "tile-expression":
      return av.filled.every((t) => t === null)
        ? null
        : av.filled.map((t) => t ?? "_").join(" ");
    case "plot-points":
      return av.points.length === 0
        ? null
        : av.points.map((p) => `(${p.x}, ${p.y})`).join(", ");
    case "categorize": {
      const entries = Object.entries(av.placement);
      return entries.length === 0
        ? null
        : entries.map(([k, v]) => `${k}->${v ?? "_"}`).join(", ");
    }
  }
}

/**
 * Build the grounding payload for a step. Pass the learner's current answer
 * (or null) and, when available, their `StepRecord` for attempt/hint context.
 */
export function buildGrounding(
  step: ProblemStep,
  answer: AnswerValue | null,
  record?: StepRecord,
): Grounding {
  const correct = correctAnswer(step.interaction);
  return {
    concept: COURSE_CONCEPT,
    prompt: step.prompt,
    interactionKind: step.interaction.kind,
    givens: buildGivens(step),
    correctAnswer: correct,
    correctAnswerText: renderAnswer(step.interaction, correct) ?? "",
    learnerAnswer: answer,
    learnerAnswerText: renderAnswer(step.interaction, answer),
    attemptNumber: record?.attempts ?? 0,
    priorHints: record?.hintsUsed ?? false,
  };
}
