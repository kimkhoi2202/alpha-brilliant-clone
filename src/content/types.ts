/**
 * Content model — a lesson is structured data, not bespoke HTML (PRD §4.1).
 * The lesson player renders each `Step` via a generic renderer + the matching
 * interaction/visual component. Adding a lesson is adding data, not UI.
 *
 * Grading is pure and client-side (see `engine.ts`): correctness is derived
 * from the interaction config + the learner's answer, so feedback is < 100ms
 * and never depends on the network.
 */

export type LessonId = string;

export type GridPoint = { x: number; y: number };

// ---------------------------------------------------------------------------
// Visuals — the declarative figure rendered alongside a step.
// ---------------------------------------------------------------------------

export type VisualSpec =
  | {
      kind: "right-triangle";
      /** Horizontal leg length (grid units). */
      a: number;
      /** Vertical leg length (grid units). */
      b: number;
      /** Draw the squares on each side (the a² + b² = c² picture). */
      showSquares?: boolean;
      /** Show side-length labels. */
      labels?: boolean;
      /** Hide the hypotenuse square's area (show a "?") when it's the unknown. */
      unknownHypotenuse?: boolean;
      unit?: string;
    }
  | {
      kind: "coordinate-grid";
      /** Grid extent: cells run 0..size on both axes. */
      size: number;
      /** Pre-placed reference points (not interactive). */
      markers?: GridPoint[];
      /** Draw the straight-line distance between the first two markers. */
      showDistance?: boolean;
    };

// ---------------------------------------------------------------------------
// Interactions — what the learner manipulates. Discriminated by `kind`.
// ---------------------------------------------------------------------------

export type Choice = { id: string; label: string };

export type Interaction =
  | { kind: "multiple-choice"; choices: Choice[]; correctChoiceId: string }
  | {
      kind: "numeric";
      answer: number;
      tolerance?: number;
      unit?: string;
      placeholder?: string;
    }
  | {
      kind: "slider";
      min: number;
      max: number;
      step: number;
      answer: number;
      tolerance?: number;
      unit?: string;
    }
  | {
      kind: "plot-points";
      /** Grid extent (0..size). */
      size: number;
      /** The point(s) the learner must place (order-independent). */
      targets: GridPoint[];
    }
  | { kind: "tap-bar"; bars: { id: string; label: string; value: number }[]; correctBarId: string }
  | {
      kind: "tile-expression";
      /** Tokens available in the bank. */
      tiles: string[];
      /** Expression layout; `null` marks a blank slot (filled left → right). */
      template: (string | null)[];
      /** The correct token for each blank, in slot order. */
      solution: string[];
    };

export type InteractionKind = Interaction["kind"];

// ---------------------------------------------------------------------------
// Answer payloads — what the player collects, by interaction kind.
// ---------------------------------------------------------------------------

export type AnswerValue =
  | { kind: "multiple-choice"; choiceId: string | null }
  | { kind: "numeric"; value: number | null }
  | { kind: "slider"; value: number }
  | { kind: "plot-points"; points: GridPoint[] }
  | { kind: "tap-bar"; barId: string | null }
  | { kind: "tile-expression"; filled: (string | null)[] };

// ---------------------------------------------------------------------------
// Feedback — hand-written, with targeted hints for likely mistakes.
// ---------------------------------------------------------------------------

export type HintRule = {
  /** Matches a chosen choice / bar id. */
  selectionId?: string;
  /** Matches a numeric / slider value (within the interaction's tolerance). */
  equals?: number;
  hint: string;
};

export type Feedback = {
  /** Shown on a correct answer ("why it's right"). */
  correct: string;
  /** Targeted hints checked in order against a wrong answer. */
  hints?: HintRule[];
  /** Fallback explanation when no hint matches. */
  default: string;
};

export type Evaluation = {
  status: "correct" | "incorrect";
  message: string;
};

// ---------------------------------------------------------------------------
// Steps & lessons.
// ---------------------------------------------------------------------------

export type ConceptStep = {
  id: string;
  kind: "concept";
  title: string;
  body: string;
  visual?: VisualSpec;
  continueLabel?: string;
};

export type ProblemStep = {
  id: string;
  kind: "problem";
  prompt: string;
  interaction: Interaction;
  visual?: VisualSpec;
  feedback: Feedback;
  /** XP awarded for a correct answer (default 15, Brilliant-style). */
  xp?: number;
};

export type Step = ConceptStep | ProblemStep;

export type Lesson = {
  id: LessonId;
  title: string;
  conceptSummary: string;
  estimatedMinutes?: number;
  steps: Step[];
};

/** A unit (level) groups lessons in the course path. */
export type CourseLevel = {
  id: string;
  label: string;
  title: string;
  /** Learning objectives shown in the level's "view details" dialog. */
  objectives?: string[];
  lessonIds: LessonId[];
};

export type Course = {
  id: string;
  title: string;
  description: string;
  /** Brand accent for nodes / primary CTAs (Brilliant theming). */
  accent: "accent" | "success" | "warning";
  levels: CourseLevel[];
};
