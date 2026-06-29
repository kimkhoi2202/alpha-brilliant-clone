/**
 * Pillar B generation core (PRD §4.2) — MODEL-AUTHORED design.
 *
 * Owner-approved reversal of the previous "verification firewall" for the
 * GENERATION path: the model now authors the COMPLETE, render-ready problem and
 * OWNS its correctness. For the requested interaction `kind` it returns the full
 * interaction (numbers, choices/tiles/template, the correct answer/solution),
 * the wording, the feedback, and (where shown) the right-triangle figure spec.
 * The server no longer picks Pythagorean triples, derives an answer key, or
 * re-grades the result. All authoring constraints live in the PROMPT
 * (`GEN_SYSTEM` / `genInput`).
 *
 * What the server STILL does is crash-prevention only (NOT correctness):
 *  - `parseProposal` validates the model JSON against a per-kind zod schema, so
 *    the output is well-typed and structurally renderable (a bad shape throws →
 *    the caller retries, then falls back).
 *  - `verify` re-affirms the assembled step is a renderable interaction shape.
 *  - `buildFallback` hand-builds a deterministic, correct, renderable problem so
 *    the learner never hits a dead-end when the model output can't be used.
 *
 * The math being right (a²+b²=c², whole-number answers, the stated answer truly
 * correct) is the MODEL's responsibility now, requested via the prompt.
 */
import { z } from "zod";
import type {
  Feedback,
  Interaction,
  ProblemStep,
  TriangleSide,
  VisualSpec,
} from "./content/types.js";

/** Interaction kinds Pillar B is allowed to generate (renderable subset, PRD §3.4). */
export const GENERABLE_KINDS = [
  "numeric",
  "count-squares",
  "pick-side",
  "multiple-choice",
  "tile-expression",
] as const;
export type GenerableKind = (typeof GENERABLE_KINDS)[number];

export type Difficulty = "easy" | "medium" | "hard";

// ---------------------------------------------------------------------------
// Seeded RNG + Pythagorean triples — used ONLY by the deterministic fallback
// (the model authors the live path; these never touch model output).
// ---------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  const item = arr[Math.floor(rng() * arr.length)];
  return item as T;
}

function shuffle<T>(rng: () => number, arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/** Common Pythagorean triples, used by the fallback so its hypotenuse is whole. */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [20, 21, 29],
];

/** Suggested leg range per difficulty (sent to the model; enforced by the fallback). */
const LEG_RANGE: Record<Difficulty, readonly [number, number]> = {
  easy: [3, 6],
  medium: [4, 12],
  hard: [6, 20],
};

/** A triple whose legs fit the difficulty's upper bound (fallback only). */
function pickTripleForDifficulty(
  difficulty: Difficulty,
  rng: () => number,
): readonly [number, number, number] {
  const hi = LEG_RANGE[difficulty][1];
  const fit = TRIPLES.filter((t) => Math.max(t[0], t[1]) <= hi);
  return pick(rng, fit.length > 0 ? fit : TRIPLES);
}

// ---------------------------------------------------------------------------
// Model proposal: strict structured-output JSON schema, per kind. The model now
// fills the FULL interaction (+ figure where shown) — not just a/b/prompt.
// ---------------------------------------------------------------------------

/**
 * Right-triangle figure the model authors for kinds that show one (numeric,
 * multiple-choice, tile-expression). The legs draw the picture; `unknownSide`
 * renders that side's label as "?", and `letterLabels` shows a/b/c instead of
 * the numeric lengths — both keep the blanked/asked value off the figure.
 */
const FIGURE_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    a: { type: "integer", minimum: 1, maximum: 25 },
    b: { type: "integer", minimum: 1, maximum: 25 },
    labels: { type: "boolean" },
    letterLabels: { type: "boolean" },
    unknownSide: { type: "string", enum: ["a", "b", "c"] },
    showHypotenuseValue: { type: "boolean" },
  },
  required: ["a", "b", "labels", "letterLabels", "unknownSide", "showHypotenuseValue"],
};

/** Per-kind `interaction` sub-schema (exact shapes the renderers consume). */
const INTERACTION_JSON_SCHEMA: Record<GenerableKind, Record<string, unknown>> = {
  numeric: {
    type: "object",
    additionalProperties: false,
    properties: {
      answer: { type: "number" },
      unit: { type: ["string", "null"] },
      tolerance: { type: ["number", "null"] },
      placeholder: { type: ["string", "null"] },
    },
    required: ["answer", "unit", "tolerance", "placeholder"],
  },
  "count-squares": {
    type: "object",
    additionalProperties: false,
    properties: {
      a: { type: "integer", minimum: 1, maximum: 12 },
      b: { type: "integer", minimum: 1, maximum: 12 },
      countSide: { type: "string", enum: ["a", "b", "c"] },
    },
    required: ["a", "b", "countSide"],
  },
  "pick-side": {
    type: "object",
    additionalProperties: false,
    properties: {
      a: { type: "integer", minimum: 1, maximum: 25 },
      b: { type: "integer", minimum: 1, maximum: 25 },
      orientation: { type: "string", enum: ["normal", "flipped"] },
      correctSide: { type: "string", enum: ["a", "b", "c"] },
    },
    required: ["a", "b", "orientation", "correctSide"],
  },
  "multiple-choice": {
    type: "object",
    additionalProperties: false,
    properties: {
      choices: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { id: { type: "string" }, label: { type: "string" } },
          required: ["id", "label"],
        },
      },
      correctChoiceId: { type: "string" },
    },
    required: ["choices", "correctChoiceId"],
  },
  "tile-expression": {
    type: "object",
    additionalProperties: false,
    properties: {
      tiles: { type: "array", items: { type: "string" } },
      template: { type: "array", items: { type: ["string", "null"] } },
      solution: { type: "array", items: { type: "string" } },
    },
    required: ["tiles", "template", "solution"],
  },
};

/** Kinds that render a separate right-triangle figure above the interaction. */
const KINDS_WITH_FIGURE: ReadonlySet<GenerableKind> = new Set<GenerableKind>([
  "numeric",
  "multiple-choice",
  "tile-expression",
]);

/** Build the strict structured-output JSON schema for a kind's full proposal. */
export function proposalSchema(kind: GenerableKind): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    prompt: { type: "string" },
    feedbackCorrect: { type: "string" },
    feedbackDefault: { type: "string" },
    interaction: INTERACTION_JSON_SCHEMA[kind],
  };
  const required = ["prompt", "feedbackCorrect", "feedbackDefault", "interaction"];
  if (KINDS_WITH_FIGURE.has(kind)) {
    properties.figure = FIGURE_JSON_SCHEMA;
    required.push("figure");
  }
  return { type: "object", additionalProperties: false, properties, required };
}

// --- zod validators: well-typedness + bounds + answerability (crash-prevention)
// These do NOT check the math (the model owns correctness). They only guarantee
// the output is structurally renderable and self-consistent enough to answer.

const figureZod = z.object({
  a: z.number().int().min(1).max(25),
  b: z.number().int().min(1).max(25),
  labels: z.boolean(),
  letterLabels: z.boolean(),
  unknownSide: z.enum(["a", "b", "c"]),
  showHypotenuseValue: z.boolean(),
});

const baseZod = {
  prompt: z.string().min(1),
  feedbackCorrect: z.string().min(1),
  feedbackDefault: z.string().min(1),
};

const numericZod = z.object({
  ...baseZod,
  interaction: z.object({
    // Finite number only — NOT forced to an integer: whole-number answers are a
    // MODEL responsibility (per the prompt), not a server rejection rule.
    answer: z.number().finite(),
    unit: z.string().nullable(),
    tolerance: z.number().nullable(),
    placeholder: z.string().nullable(),
  }),
  figure: figureZod,
});

const countSquaresZod = z.object({
  ...baseZod,
  interaction: z.object({
    a: z.number().int().min(1).max(12),
    b: z.number().int().min(1).max(12),
    countSide: z.enum(["a", "b", "c"]),
  }),
});

const pickSideZod = z.object({
  ...baseZod,
  interaction: z.object({
    a: z.number().int().min(1).max(25),
    b: z.number().int().min(1).max(25),
    orientation: z.enum(["normal", "flipped"]),
    correctSide: z.enum(["a", "b", "c"]),
  }),
});

const multipleChoiceZod = z.object({
  ...baseZod,
  interaction: z
    .object({
      choices: z
        .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
        .min(2)
        .max(6),
      correctChoiceId: z.string().min(1),
    })
    // Answerability (not math): the declared correct option must exist, and ids
    // must be unique so selection/grading is unambiguous.
    .refine((i) => new Set(i.choices.map((c) => c.id)).size === i.choices.length, {
      message: "choice ids must be unique",
    })
    .refine((i) => i.choices.some((c) => c.id === i.correctChoiceId), {
      message: "correctChoiceId must match one of the choices",
    }),
  figure: figureZod,
});

const tileExpressionZod = z.object({
  ...baseZod,
  interaction: z
    .object({
      tiles: z.array(z.string().min(1)).min(2).max(10),
      template: z.array(z.string().nullable()).min(1).max(20),
      solution: z.array(z.string().min(1)).min(1).max(6),
    })
    // Answerability (not math): one tile per blank, every answer drawn from the
    // bank — otherwise the puzzle can't be completed/graded.
    .refine(
      (i) => i.template.filter((t) => t === null).length === i.solution.length,
      { message: "number of blanks must equal solution length" },
    )
    .refine((i) => i.solution.every((tok) => i.tiles.includes(tok)), {
      message: "every solution tile must be in the bank",
    }),
  figure: figureZod,
});

/** A validated, kind-tagged model proposal (the full problem the model authored). */
export type Proposal =
  | ({ kind: "numeric" } & z.infer<typeof numericZod>)
  | ({ kind: "count-squares" } & z.infer<typeof countSquaresZod>)
  | ({ kind: "pick-side" } & z.infer<typeof pickSideZod>)
  | ({ kind: "multiple-choice" } & z.infer<typeof multipleChoiceZod>)
  | ({ kind: "tile-expression" } & z.infer<typeof tileExpressionZod>);

/** Parse + validate raw model JSON into a typed proposal (throws on mismatch). */
export function parseProposal(kind: GenerableKind, raw: unknown): Proposal {
  switch (kind) {
    case "numeric":
      return { kind, ...numericZod.parse(raw) };
    case "count-squares":
      return { kind, ...countSquaresZod.parse(raw) };
    case "pick-side":
      return { kind, ...pickSideZod.parse(raw) };
    case "multiple-choice":
      return { kind, ...multipleChoiceZod.parse(raw) };
    case "tile-expression":
      return { kind, ...tileExpressionZod.parse(raw) };
  }
}

// ---------------------------------------------------------------------------
// Instructions for the model — ALL authoring constraints live here now.
// ---------------------------------------------------------------------------

export const GEN_SYSTEM = [
  "You are an expert author of interactive practice problems for a Pythagorean-theorem course.",
  "You design a COMPLETE, ready-to-render problem and you OWN its correctness: the app renders exactly what you return and does NOT recompute or re-verify the answer, so any mistake reaches the learner.",
  "",
  "Hard rules — follow every one:",
  "1. Correct math. For right triangles a² + b² = c². Any answer or solution you give MUST be exactly right for the numbers you chose.",
  "2. Whole-number answers ONLY — never irrational or decimal answers (e.g. never 22.2). For any hypotenuse/leg length, choose legs from a Pythagorean triple — 3-4-5, 6-8-10, 5-12-13, 8-15-17, 9-12-15, 7-24-25, 20-21-29 (or simple multiples) — so the unknown side is a whole number.",
  "3. Match the requested difficulty (stay within the suggested leg range) and keep numbers realistic and easy to reason about.",
  "4. Never reveal the answer in the prompt or the default hint, and never print the unknown/asked value on the figure.",
  "5. Output STRICTLY as the provided JSON schema for the requested kind — no extra prose and no extra fields.",
  "Keep prompts and feedback concise and learner-friendly.",
].join("\n");

export function genInput(kind: GenerableKind, difficulty: Difficulty): string {
  const [lo, hi] = LEG_RANGE[difficulty];
  const lines = [
    `Author one ${kind} problem.`,
    `Difficulty: ${difficulty} — use leg lengths roughly between ${lo} and ${hi}.`,
    "Vary the specific numbers and wording so problems feel fresh.",
    "",
  ];
  switch (kind) {
    case "numeric":
      lines.push(
        "Type-in numeric answer. Fill `interaction` { answer, unit, tolerance, placeholder } and a right-triangle `figure`.",
        'Find-the-hypotenuse: set figure.a and figure.b to the two legs, figure.labels=true, figure.unknownSide="c", figure.showHypotenuseValue=false, figure.letterLabels=false, and interaction.answer = √(a²+b²) (whole number → use a triple).',
        'Find-a-leg: set figure.a and figure.b to the two legs, figure.labels=true, figure.unknownSide to the asked leg ("a" or "b"), figure.showHypotenuseValue=true, figure.letterLabels=false, and interaction.answer = that leg\'s length.',
        'Use unit "" or null if there is none; tolerance 0 (or null) for an exact whole-number answer; placeholder "?".',
        "The asked side MUST be the figure's unknownSide so its value is never shown.",
      );
      break;
    case "count-squares":
      lines.push(
        "Counting interaction. Fill `interaction` { a, b, countSide }. The app draws a right triangle with a unit-grid square on each side; the learner counts the cells in the square on `countSide` (a → a², b → b², c → a²+b²).",
        'Keep a and b SMALL so the grid is easy to count. If countSide="c", use a Pythagorean triple (e.g. 3 and 4) so the hypotenuse square is a clean whole-number grid. No figure or answer field is needed.',
      );
      break;
    case "pick-side":
      lines.push(
        'Tap-a-side interaction. Fill `interaction` { a, b, orientation, correctSide }. correctSide: "a"=bottom leg, "b"=vertical leg, "c"=hypotenuse. orientation "normal" is the standard figure; "flipped" mirrors it (use "normal" unless you want the mirror).',
        "Word the prompt to ask for exactly that side (e.g. \"Tap the hypotenuse.\"). The side you mark IS the answer; no answer field is needed.",
      );
      break;
    case "multiple-choice":
      lines.push(
        "Single-answer choice (which length is the hypotenuse). Fill `interaction` { choices, correctChoiceId } and a right-triangle `figure`.",
        'Provide 3–4 choices, each with a short unique id (e.g. "o1") and a numeric label. The correct label = the true whole-number hypotenuse; the others are plausible but wrong. correctChoiceId MUST equal the correct option\'s id.',
        'Figure: a and b = the legs (from a triple), labels=true, unknownSide="c", letterLabels=false, showHypotenuseValue=false. Do not reveal which option is correct in the prompt.',
      );
      break;
    case "tile-expression":
      lines.push(
        "Drag-the-tiles interaction to complete a² + b² = c². Fill `interaction` { template, solution, tiles } and a right-triangle `figure`.",
        'template is the equation as an array of tokens; use null for each blank to fill and the actual numbers for the shown value slots, e.g. ["3","²","+",null,"²","=","5","²"]. solution lists the correct tile for each blank, in order. tiles is the draggable bank: include every solution tile plus 1–2 plausible distractors.',
        "The number of null blanks MUST equal solution.length, and every solution tile MUST appear in tiles. Use a Pythagorean triple so the equation is true.",
        'Figure: a and b = the legs, labels=true, letterLabels=true (so the sides read a/b/c, NOT their numbers — this keeps the blanked value off the figure), showHypotenuseValue=false. Set unknownSide="c" (it is ignored while letterLabels is true).',
      );
      break;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Assembly: WRAP the model's full proposal into a ProblemStep. No math here.
// ---------------------------------------------------------------------------

const SIDE_NAMES: Record<TriangleSide, string> = {
  a: "bottom leg",
  b: "vertical leg",
  c: "hypotenuse",
};

function feedbackOf(p: { feedbackCorrect: string; feedbackDefault: string }): Feedback {
  return { correct: p.feedbackCorrect, default: p.feedbackDefault };
}

/** Map the model's figure proposal into a render-ready right-triangle `VisualSpec`. */
function buildFigure(f: z.infer<typeof figureZod>): VisualSpec {
  return {
    kind: "right-triangle",
    a: f.a,
    b: f.b,
    labels: f.labels,
    unknownSide: f.unknownSide,
    ...(f.letterLabels ? { letterLabels: true } : {}),
    ...(f.showHypotenuseValue ? { showHypotenuseValue: true } : {}),
  };
}

/**
 * Turn a validated proposal into a render-ready `ProblemStep`. The interaction,
 * answer/solution, wording, and figure are taken verbatim from the model (it
 * owns correctness); the server only assigns the id, attaches default pick-side
 * names, drops nullable optionals, and tags provenance.
 */
export function assemble(p: Proposal): ProblemStep {
  const id = `ai-${p.kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  let interaction: Interaction;
  let visual: VisualSpec | undefined;

  switch (p.kind) {
    case "numeric": {
      const i = p.interaction;
      interaction = {
        kind: "numeric",
        answer: i.answer,
        ...(i.tolerance !== null ? { tolerance: i.tolerance } : {}),
        ...(i.unit !== null && i.unit !== "" ? { unit: i.unit } : {}),
        ...(i.placeholder !== null && i.placeholder !== "" ? { placeholder: i.placeholder } : {}),
      };
      visual = buildFigure(p.figure);
      break;
    }
    case "count-squares": {
      const i = p.interaction;
      interaction = { kind: "count-squares", a: i.a, b: i.b, countSide: i.countSide };
      break;
    }
    case "pick-side": {
      const i = p.interaction;
      interaction = {
        kind: "pick-side",
        a: i.a,
        b: i.b,
        orientation: i.orientation,
        correctSide: i.correctSide,
        sideNames: SIDE_NAMES,
      };
      break;
    }
    case "multiple-choice": {
      const i = p.interaction;
      interaction = {
        kind: "multiple-choice",
        choices: i.choices.map((c) => ({ id: c.id, label: c.label })),
        correctChoiceId: i.correctChoiceId,
      };
      visual = buildFigure(p.figure);
      break;
    }
    case "tile-expression": {
      const i = p.interaction;
      interaction = {
        kind: "tile-expression",
        tiles: [...i.tiles],
        template: [...i.template],
        solution: [...i.solution],
      };
      visual = buildFigure(p.figure);
      break;
    }
  }

  return {
    id,
    kind: "problem",
    prompt: p.prompt,
    interaction,
    feedback: feedbackOf(p),
    source: "ai",
    ...(visual ? { visual } : {}),
  };
}

// ---------------------------------------------------------------------------
// Crash-prevention gate (NOT correctness): the assembled step must be a
// renderable interaction shape so the UI can never white-screen.
// ---------------------------------------------------------------------------

function isFinitePositive(n: unknown): boolean {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

/** A present figure must be a known visual kind with finite positive legs. */
function isRenderableFigure(visual: VisualSpec | undefined): boolean {
  if (!visual) return true;
  if (visual.kind === "right-triangle" || visual.kind === "rearrangement-proof") {
    return isFinitePositive(visual.a) && isFinitePositive(visual.b);
  }
  return visual.kind === "coordinate-grid";
}

/**
 * Shape/renderability gate (replaces the old correctness firewall). It checks
 * ONLY that the step parses into a renderable interaction shape — required
 * fields present, well-typed, arrays are arrays, enums valid, the answer key
 * references real options/tiles. It deliberately does NOT check whether the math
 * is right; correctness is the model's responsibility now.
 */
export function verify(step: ProblemStep): boolean {
  if (step.kind !== "problem") return false;
  if (typeof step.prompt !== "string" || step.prompt.length === 0) return false;
  if (typeof step.feedback.correct !== "string" || typeof step.feedback.default !== "string") {
    return false;
  }
  if (!isRenderableFigure(step.visual)) return false;

  const i = step.interaction;
  switch (i.kind) {
    case "numeric":
      return typeof i.answer === "number" && Number.isFinite(i.answer);
    case "count-squares":
      return isFinitePositive(i.a) && isFinitePositive(i.b);
    case "pick-side":
      return isFinitePositive(i.a) && isFinitePositive(i.b);
    case "multiple-choice": {
      if (!Array.isArray(i.choices) || i.choices.length < 2) return false;
      if (!i.choices.every((c) => typeof c.id === "string" && typeof c.label === "string")) {
        return false;
      }
      return i.choices.some((c) => c.id === i.correctChoiceId);
    }
    case "tile-expression": {
      if (!Array.isArray(i.tiles) || !Array.isArray(i.template) || !Array.isArray(i.solution)) {
        return false;
      }
      const blanks = i.template.filter((t) => t === null).length;
      if (blanks !== i.solution.length) return false;
      return i.solution.every((tok) => i.tiles.includes(tok));
    }
    default:
      // Generation only produces the five kinds above; anything else is not a
      // valid generated shape.
      return false;
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback (PRD §4.2 step 4): a hand-built, correct, renderable
// problem when the model output can't be used. Guarantees no dead-end.
// ---------------------------------------------------------------------------

/** Three distinct wrong integer options for a hypotenuse multiple-choice. */
function fallbackDistractors(a: number, b: number, c: number): number[] {
  const candidates = [a + b, a * a + b * b, c + 1, Math.max(1, c - 1)];
  const out: number[] = [];
  for (const cand of candidates) {
    if (cand === c || out.includes(cand)) continue;
    out.push(cand);
    if (out.length === 3) break;
  }
  // Top up defensively so we always have three distinct distractors.
  let extra = c + 2;
  while (out.length < 3) {
    if (extra !== c && !out.includes(extra)) out.push(extra);
    extra += 1;
  }
  return out;
}

export function buildFallback(
  kind: GenerableKind,
  difficulty: Difficulty,
  seed: number,
): ProblemStep {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const [a, b, c] = pickTripleForDifficulty(difficulty, rng);

  const proposal: Proposal = ((): Proposal => {
    switch (kind) {
      case "numeric":
        return {
          kind,
          prompt: `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`,
          feedbackCorrect: `Exactly. √(${a}² + ${b}²) = ${c}.`,
          feedbackDefault: "Square each leg, add them, then take the square root.",
          interaction: { answer: c, unit: null, tolerance: 0.01, placeholder: "?" },
          figure: { a, b, labels: true, letterLabels: false, unknownSide: "c", showHypotenuseValue: false },
        };
      case "count-squares":
        return {
          kind,
          prompt: "Count the unit squares in the square drawn on the hypotenuse.",
          feedbackCorrect: "Nice counting. That's the area of the hypotenuse square.",
          feedbackDefault: "Count every unit cell inside the highlighted square.",
          interaction: { a: 3, b: 4, countSide: "c" },
        };
      case "pick-side": {
        const targetSide = pick(rng, ["a", "b", "c"] as const);
        return {
          kind,
          prompt: `Tap the ${SIDE_NAMES[targetSide]} of the right triangle.`,
          feedbackCorrect: "That's the one!",
          feedbackDefault: "Look at where the right angle is, then find the requested side.",
          interaction: { a, b, orientation: "normal", correctSide: targetSide },
        };
      }
      case "multiple-choice": {
        const correct = { id: "opt_correct", label: String(c) };
        const wrong = fallbackDistractors(a, b, c).map((d, i) => ({
          id: `opt_${i}`,
          label: String(d),
        }));
        const choices = shuffle(rng, [correct, ...wrong]);
        return {
          kind,
          prompt: `Which length is the hypotenuse of a right triangle with legs ${a} and ${b}?`,
          feedbackCorrect: `Right. It's ${c}.`,
          feedbackDefault: "Use a² + b² = c² and take the square root.",
          interaction: { choices, correctChoiceId: correct.id },
          figure: { a, b, labels: true, letterLabels: false, unknownSide: "c", showHypotenuseValue: false },
        };
      }
      case "tile-expression": {
        const template: (string | null)[] = [String(a), "²", "+", null, "²", "=", String(c), "²"];
        const solution = [String(b)];
        const tiles = shuffle(
          rng,
          Array.from(new Set([String(b), String(a), String(c), String(b + 1)])),
        );
        return {
          kind,
          prompt: `Complete the Pythagorean relationship for legs ${a} and ${b}.`,
          feedbackCorrect: "Perfect. That's the theorem.",
          feedbackDefault: "Place the two leg lengths into the squared slots.",
          interaction: { tiles, template, solution },
          figure: { a, b, labels: true, letterLabels: true, unknownSide: "c", showHypotenuseValue: false },
        };
      }
    }
  })();

  const step = assemble(proposal);
  if (!verify(step)) {
    // Should never happen for triples; surface loudly if it does.
    throw new Error(`fallback failed verification for kind=${kind}`);
  }
  return step;
}
