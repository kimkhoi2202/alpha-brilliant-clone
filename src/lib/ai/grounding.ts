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
  /** The learner's current answer, or null if they haven't answered yet. */
  learnerAnswer: AnswerValue | null;
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
 * Build the grounding payload for a step. Pass the learner's current answer
 * (or null) and, when available, their `StepRecord` for attempt/hint context.
 */
export function buildGrounding(
  step: ProblemStep,
  answer: AnswerValue | null,
  record?: StepRecord,
): Grounding {
  return {
    concept: COURSE_CONCEPT,
    prompt: step.prompt,
    interactionKind: step.interaction.kind,
    givens: buildGivens(step),
    correctAnswer: correctAnswer(step.interaction),
    learnerAnswer: answer,
    attemptNumber: record?.attempts ?? 0,
    priorHints: record?.hintsUsed ?? false,
  };
}
