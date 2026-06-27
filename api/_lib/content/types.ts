/**
 * Content model — VENDORED COPY for the Vercel `/api` serverless backend.
 *
 * A faithful mirror of `src/content/types.ts` (the client content model), ported
 * verbatim from `functions/src/content/types.ts`. It lives inside `api/_lib/` so
 * the serverless verification firewall (`engine.ts` + `generation.ts`) and the
 * generated `ProblemStep` shape match exactly what the client renders/grades.
 *
 * Only addition vs. the client copy: `ProblemStep.source` (PRD §3.4 — additive,
 * backward-compatible). Keep byte-for-byte aligned with the client copy.
 */

export type LessonId = string;

export type GridPoint = { x: number; y: number };

// ---------------------------------------------------------------------------
// Visuals: the declarative figure rendered alongside a step.
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
      /**
       * Draw each side-square as a grid of unit cells (implies `showSquares`),
       * so the learner can count the area instead of being told it. The center
       * area number is hidden in this mode: counting is the point.
       */
      gridSquares?: boolean;
      /**
       * Tint one square gold (the "this is the one in question" highlight) while
       * the others stay accent-blue, e.g. the square the learner is counting.
       * Defaults to the hypotenuse square being gold.
       */
      highlightSquare?: "a" | "b" | "c";
      /** Show side-length labels. */
      labels?: boolean;
      /** Hide the hypotenuse square's area (show a "?") when it's the unknown. */
      unknownHypotenuse?: boolean;
      /**
       * Mark one side's *length* label as the unknown (a gold "?") instead of
       * its value, for "find this side" problems. Independent of the squares
       * picture's `unknownHypotenuse`.
       */
      unknownSide?: "a" | "b" | "c";
      /** Label the hypotenuse with its computed length √(a²+b²) instead of "c". */
      showHypotenuseValue?: boolean;
      /** Label the legs a / b (and the hypotenuse c) instead of numeric lengths,
       *  for "which side is which?" identification questions. */
      letterLabels?: boolean;
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
    }
  | {
      /**
       * Interactive rearrangement proof: four copies of the right triangle in an
       * (a+b) x (a+b) square. A toggle morphs them between the arrangement whose
       * leftover area is c² and the one whose leftover is a² + b², the same
       * square and the same four triangles, so the two leftovers must be equal.
       */
      kind: "rearrangement-proof";
      a: number;
      b: number;
    };

// ---------------------------------------------------------------------------
// Interactions: what the learner manipulates. Discriminated by `kind`.
// ---------------------------------------------------------------------------

export type Choice = { id: string; label: string };

/** A side of a right triangle: the two legs (a, b) and the hypotenuse (c). */
export type TriangleSide = "a" | "b" | "c";

/**
 * Which way a right-triangle figure faces (for the tap-a-side interaction).
 * - `normal`: right angle bottom-left, a = bottom leg, b = left vertical leg,
 *   c = hypotenuse on the right (the classic textbook orientation).
 * - `flipped`: right angle bottom-right, a = right vertical leg, b = bottom leg,
 *   c = hypotenuse on the left (the mirror image).
 */
export type TriangleOrientation = "normal" | "flipped";

/**
 * A corner (vertex) of a right triangle, as drawn by the figure:
 * - `A`: bottom-left, where the two legs meet (the right angle)
 * - `B`: bottom-right, where leg `a` meets the hypotenuse
 * - `C`: top, where leg `b` meets the hypotenuse
 */
export type TriangleVertex = "A" | "B" | "C";

export type CategoryBin = { id: string; label: string };
export type CategoryItem = { id: string; label: string; binId: string };

export type Interaction =
  | { kind: "multiple-choice"; choices: Choice[]; correctChoiceId: string }
  | {
      /** Select all that apply. Correct iff the chosen set equals the answer set. */
      kind: "multi-select";
      choices: Choice[];
      correctChoiceIds: string[];
    }
  | {
      /** Sort each item into the bin it belongs to (e.g. Yes / No). */
      kind: "categorize";
      bins: CategoryBin[];
      items: CategoryItem[];
    }
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
    }
  | {
      /** Pick a side of a right triangle by tapping it directly on the figure. */
      kind: "pick-side";
      /** Leg lengths used to draw the figure. */
      a: number;
      b: number;
      /** Which way the figure faces (default "normal"). */
      orientation?: TriangleOrientation;
      /** The side that is the correct answer. */
      correctSide: TriangleSide;
      /** Descriptive names revealed on select (defaults: bottom / vertical / slanted). */
      sideNames?: Partial<Record<TriangleSide, string>>;
    }
  | {
      /** Pick several sides of a right triangle by tapping them (select-all). */
      kind: "pick-sides";
      a: number;
      b: number;
      /** Which way the figure faces (default "normal"). */
      orientation?: TriangleOrientation;
      /** The set of sides to select (order-independent). */
      correctSides: TriangleSide[];
      sideNames?: Partial<Record<TriangleSide, string>>;
    }
  | {
      /** Pick a corner of a right triangle by tapping it (e.g. the right angle). */
      kind: "pick-angle";
      a: number;
      b: number;
      /** The vertex that is the correct answer. */
      correctVertex: TriangleVertex;
      /** Descriptive names revealed on select (defaults: bottom-left / bottom-right / top). */
      vertexNames?: Partial<Record<TriangleVertex, string>>;
    }
  | {
      /**
       * Count the unit cells in one square of the right-triangle figure, typing
       * the count directly into that (highlighted) square. The correct answer is
       * the square's cell count: a² for leg a, b² for leg b, a²+b² for the
       * hypotenuse.
       */
      kind: "count-squares";
      a: number;
      b: number;
      /** Which square to count (and highlight gold). */
      countSide: TriangleSide;
    };

export type InteractionKind = Interaction["kind"];

// ---------------------------------------------------------------------------
// Answer payloads: what the player collects, by interaction kind.
// ---------------------------------------------------------------------------

export type AnswerValue =
  | { kind: "multiple-choice"; choiceId: string | null }
  | { kind: "multi-select"; choiceIds: string[] }
  | { kind: "categorize"; placement: Record<string, string | null> }
  | { kind: "numeric"; value: number | null }
  | { kind: "slider"; value: number }
  | { kind: "plot-points"; points: GridPoint[] }
  | { kind: "tap-bar"; barId: string | null }
  | { kind: "tile-expression"; filled: (string | null)[] }
  | { kind: "pick-side"; side: TriangleSide | null }
  | { kind: "pick-sides"; sides: TriangleSide[] }
  | { kind: "pick-angle"; vertex: TriangleVertex | null }
  | { kind: "count-squares"; value: number | null };

// ---------------------------------------------------------------------------
// Feedback: hand-written, with targeted hints for likely mistakes.
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
  /** Optional formula rendered large and centered on its own line, below the
   *  body, for theorems/identities you want to stand out. */
  equation?: string;
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
  /**
   * Provenance of the step (PRD §3.4, additive). Phase 1 content is implicitly
   * `"authored"`; verified generated problems are tagged `"ai"`.
   */
  source?: "authored" | "ai";
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
