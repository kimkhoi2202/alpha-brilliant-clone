/**
 * Pillar B generation core (PRD §4.2) — ported verbatim from
 * `functions/src/shared/generation.ts` (only the relative import paths to the
 * vendored content model change). The model PROPOSES a scenario via strict
 * structured output; WE compute every answer-bearing field with `mathjs` + the
 * vendored engine, assemble a `ProblemStep`, and run the verification firewall
 * (`gradeStep(step, correctAnswer(step.interaction))`) before it can be returned.
 *
 * The model never supplies an answer key (P4). For each kind it returns only:
 * leg lengths, the prompt, and feedback text — the gradeable truth is ours.
 */
import { evaluate } from "mathjs";
import { z } from "zod";
import type {
  Choice,
  Feedback,
  Interaction,
  ProblemStep,
  TriangleSide,
  VisualSpec,
} from "./content/types.js";
import { correctAnswer, gradeStep } from "./content/engine.js";

/** Interaction kinds Pillar B is allowed to generate (verifiable only, PRD §3.4). */
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
// Ground-truth math — the answer key is ALWAYS computed here, never by the model.
// ---------------------------------------------------------------------------

/** c = √(a² + b²), computed via mathjs (PRD §2.2: "model never asserts a computed fact"). */
export function hypotenuse(a: number, b: number): number {
  return Number(evaluate(`sqrt(${a}^2 + ${b}^2)`));
}

/** Format a number as a clean label (integers as-is, else 2 dp). */
function numLabel(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Seeded RNG (deterministic server-side choices: target side, fallback picks).
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
  // arr is non-empty and index is in range, so this is defined.
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

/** Common Pythagorean triples, used for kinds that need an integer hypotenuse. */
const TRIPLES: ReadonlyArray<readonly [number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [9, 12, 15],
  [7, 24, 25],
  [20, 21, 29],
];

const LEG_RANGE: Record<Difficulty, readonly [number, number]> = {
  easy: [3, 6],
  medium: [4, 12],
  hard: [6, 20],
};

// ---------------------------------------------------------------------------
// Model proposal: strict JSON schema + matching zod validator, per kind.
// ---------------------------------------------------------------------------

const baseProps = {
  a: { type: "integer", minimum: 1, maximum: 25 },
  b: { type: "integer", minimum: 1, maximum: 25 },
  prompt: { type: "string" },
  feedbackCorrect: { type: "string" },
  feedbackDefault: { type: "string" },
} as const;

/** Build the strict structured-output JSON schema for a kind's proposal. */
export function proposalSchema(kind: GenerableKind): Record<string, unknown> {
  const properties: Record<string, unknown> = { ...baseProps };
  const required = ["a", "b", "prompt", "feedbackCorrect", "feedbackDefault"];

  if (kind === "count-squares") {
    properties["countSide"] = { type: "string", enum: ["a", "b", "c"] };
    required.push("countSide");
  }
  if (kind === "numeric") {
    properties["unit"] = { type: "string" };
    required.push("unit");
  }

  return {
    type: "object",
    additionalProperties: false,
    properties,
    required,
  };
}

const baseZod = {
  a: z.number().int().min(1).max(25),
  b: z.number().int().min(1).max(25),
  prompt: z.string().min(1),
  feedbackCorrect: z.string().min(1),
  feedbackDefault: z.string().min(1),
};

const zodByKind = {
  numeric: z.object({ ...baseZod, unit: z.string() }),
  "count-squares": z.object({ ...baseZod, countSide: z.enum(["a", "b", "c"]) }),
  "pick-side": z.object({ ...baseZod }),
  "multiple-choice": z.object({ ...baseZod }),
  "tile-expression": z.object({ ...baseZod }),
} as const;

export type Proposal = z.infer<(typeof zodByKind)[GenerableKind]>;

/** Parse + validate raw model JSON into a typed proposal (throws on mismatch). */
export function parseProposal(kind: GenerableKind, raw: unknown): Proposal {
  return zodByKind[kind].parse(raw) as Proposal;
}

// ---------------------------------------------------------------------------
// Instructions for the model (no answer key requested).
// ---------------------------------------------------------------------------

export const GEN_SYSTEM =
  "You design practice problems for a Pythagorean-theorem course. You propose ONLY " +
  "the scenario: the two leg lengths, the question prompt, and feedback text. You must " +
  "NOT compute, state, or include any answer, solution, correct option, or answer key — " +
  "the application computes and verifies all answers itself. Keep prompts and feedback " +
  "concise and learner-friendly.";

export function genInput(
  kind: GenerableKind,
  difficulty: Difficulty,
  targetSide: TriangleSide,
): string {
  const [lo, hi] = LEG_RANGE[difficulty];
  const lines = [
    `Interaction kind: ${kind}`,
    `Difficulty: ${difficulty} (use leg lengths roughly between ${lo} and ${hi}).`,
  ];
  switch (kind) {
    case "numeric":
      lines.push(
        "Ask the learner to compute the hypotenuse length from the two legs. Provide a `unit` (e.g. \"cm\") or empty string.",
      );
      break;
    case "count-squares":
      lines.push(
        "Ask the learner to count the unit cells in one side's square (the legs are 'a' and 'b', the hypotenuse is 'c'). Set countSide to the side you ask them to count.",
      );
      break;
    case "pick-side": {
      const name =
        targetSide === "c" ? "hypotenuse" : targetSide === "a" ? "bottom leg" : "vertical leg";
      lines.push(`Ask the learner to tap the ${name} of the right triangle.`);
      break;
    }
    case "multiple-choice":
      lines.push(
        "Ask the learner to choose the hypotenuse length. Do NOT provide answer options — the app builds them.",
      );
      break;
    case "tile-expression":
      lines.push(
        "Use leg lengths from a Pythagorean triple so the hypotenuse is a whole number. Ask the learner to complete a² + b² = c² by placing the leg values.",
      );
      break;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Assembly: build the full, answer-bearing ProblemStep from a proposal.
// ---------------------------------------------------------------------------

function feedbackOf(p: Proposal): Feedback {
  return { correct: p.feedbackCorrect, default: p.feedbackDefault };
}

const SIDE_NAMES: Record<TriangleSide, string> = {
  a: "bottom leg",
  b: "vertical leg",
  c: "hypotenuse",
};

export interface AssembleContext {
  kind: GenerableKind;
  difficulty: Difficulty;
  /** Server-chosen target side for pick-side (the answer key — ours, not the model's). */
  targetSide: TriangleSide;
  rng: () => number;
}

/**
 * Turn a validated proposal into a verified-shape `ProblemStep`. All
 * answer-bearing fields are computed here (mathjs / engine), never taken from
 * the model. Throws if the scenario can't form a valid problem (→ caller retries).
 */
export function assemble(p: Proposal, ctx: AssembleContext): ProblemStep {
  const id = `ai-${ctx.kind}-${Date.now().toString(36)}-${Math.floor(ctx.rng() * 1e6).toString(36)}`;
  const a = p.a;
  const b = p.b;

  let interaction: Interaction;
  let visual: VisualSpec | undefined;
  // For kinds where the model authors the prompt, we may override it server-side
  // so the prompt can never desync from the server-owned answer key (W2).
  let promptOverride: string | undefined;

  switch (ctx.kind) {
    case "numeric": {
      const c = hypotenuse(a, b);
      if (!Number.isFinite(c)) throw new Error("non-finite hypotenuse");
      const unit = "unit" in p ? p.unit : "";
      interaction = {
        kind: "numeric",
        answer: c,
        tolerance: 0.01,
        unit: unit || undefined,
        placeholder: "?",
      };
      visual = { kind: "right-triangle", a, b, labels: true, unknownSide: "c" };
      break;
    }
    case "count-squares": {
      const countSide = "countSide" in p ? p.countSide : "c";
      interaction = { kind: "count-squares", a, b, countSide };
      visual = {
        kind: "right-triangle",
        a,
        b,
        gridSquares: true,
        highlightSquare: countSide,
      };
      // Author the prompt deterministically from the server-owned countSide so it
      // can never desync from the highlighted square (W2, same pattern as pick-side).
      promptOverride = `Count the unit squares in the square drawn on the ${SIDE_NAMES[countSide]}.`;
      break;
    }
    case "pick-side": {
      interaction = {
        kind: "pick-side",
        a,
        b,
        orientation: "normal",
        correctSide: ctx.targetSide, // server-owned answer key
        sideNames: SIDE_NAMES,
      };
      // Author the prompt deterministically so it always matches `targetSide`
      // (a model-written prompt could ask for a different side → desync, W2).
      promptOverride = `Tap the ${SIDE_NAMES[ctx.targetSide]} of the right triangle.`;
      break;
    }
    case "multiple-choice": {
      const c = hypotenuse(a, b);
      if (!Number.isFinite(c)) throw new Error("non-finite hypotenuse");
      // Build options server-side: one correct (c) + genuinely-wrong distractors.
      const candidates = [a + b, a * a + b * b, Math.round(c) + 1, Math.max(1, Math.round(c) - 1)];
      const distractors: number[] = [];
      for (const cand of candidates) {
        if (Math.abs(cand - c) < 1e-6) continue; // not actually wrong
        if (distractors.some((d) => Math.abs(d - cand) < 1e-6)) continue; // duplicate
        distractors.push(cand);
        if (distractors.length === 3) break;
      }
      if (distractors.length < 3) throw new Error("could not build distinct distractors");
      const correct = { id: "opt_correct", label: numLabel(c) };
      const wrong: Choice[] = distractors.map((d, i) => ({ id: `opt_${i}`, label: numLabel(d) }));
      const choices = shuffle(ctx.rng, [correct, ...wrong]);
      interaction = { kind: "multiple-choice", choices, correctChoiceId: correct.id };
      visual = { kind: "right-triangle", a, b, labels: true, unknownSide: "c" };
      break;
    }
    case "tile-expression": {
      const c = hypotenuse(a, b);
      if (!Number.isInteger(c)) throw new Error("tile-expression needs an integer hypotenuse");
      // a² + b² is commutative, so a two-blank [a, b] template marked the learner
      // wrong whenever they placed the legs in the other (equally valid) order
      // (~50% of the time). Fix leg `a` in the template and blank ONLY leg `b`,
      // making the placement unambiguous (C2).
      const template: (string | null)[] = [String(a), "²", "+", null, "²", "=", String(c), "²"];
      const solution = [String(b)];
      const tiles = shuffle(
        ctx.rng,
        Array.from(new Set([String(b), String(a), String(c), String(b + 1)])),
      );
      interaction = { kind: "tile-expression", tiles, template, solution };
      visual = { kind: "right-triangle", a, b, labels: true };
      break;
    }
  }

  const step: ProblemStep = {
    id,
    kind: "problem",
    prompt: promptOverride ?? p.prompt,
    interaction,
    feedback: feedbackOf(p),
    source: "ai",
    ...(visual ? { visual } : {}),
  };
  return step;
}

// ---------------------------------------------------------------------------
// Verification firewall: nothing is returned unless it grades correct.
// ---------------------------------------------------------------------------

/**
 * The gate (P3/P4): the engine must grade the engine's own `correctAnswer` as
 * correct, plus kind-specific structural checks. Returns true iff the step is safe.
 */
export function verify(step: ProblemStep): boolean {
  const { interaction } = step;

  // Round-trip: feed the canonical answer back through the grader.
  const eval_ = gradeStep(step, correctAnswer(interaction));
  if (eval_.status !== "correct") return false;

  switch (interaction.kind) {
    case "numeric": {
      if (!Number.isFinite(interaction.answer)) return false;
      // Independent firewall: don't just trust the stored answer — recompute
      // c = √(a²+b²) from the visual's right-triangle legs and require they
      // agree within tolerance. Reject if we can't recompute (W).
      const v = step.visual;
      if (!v || v.kind !== "right-triangle") return false;
      const c = hypotenuse(v.a, v.b);
      if (!Number.isFinite(c)) return false;
      return Math.abs(interaction.answer - c) <= (interaction.tolerance ?? 0);
    }
    case "multiple-choice": {
      // Exactly one option must match the (server-computed) correct choice id,
      // and every distractor must be a genuinely different number.
      const correct = interaction.choices.find((c) => c.id === interaction.correctChoiceId);
      if (!correct) return false;
      const correctVal = Number(correct.label);
      if (!Number.isFinite(correctVal)) return false;
      const matches = interaction.choices.filter(
        (c) => Math.abs(Number(c.label) - correctVal) < 1e-6,
      );
      return matches.length === 1 && interaction.choices.length >= 2;
    }
    case "tile-expression": {
      const blanks = interaction.template.filter((t) => t === null).length;
      if (blanks !== interaction.solution.length) return false;
      // Every solution token must be available in the tile bank.
      return interaction.solution.every((tok) => interaction.tiles.includes(tok));
    }
    case "count-squares":
    case "pick-side":
      return true;
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Deterministic fallback (PRD §4.2 step 4): a hand-built, pre-verified problem
// when generation/verification can't produce one. Guarantees no dead-end.
// ---------------------------------------------------------------------------

export function buildFallback(
  kind: GenerableKind,
  difficulty: Difficulty,
  seed: number,
): ProblemStep {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const triple = pick(rng, TRIPLES);
  const [a, b, c] = triple;
  const targetSide = pick(rng, ["a", "b", "c"] as const);

  const proposal: Proposal = ((): Proposal => {
    switch (kind) {
      case "numeric":
        return {
          a,
          b,
          unit: "cm",
          prompt: `A right triangle has legs ${a} cm and ${b} cm. How long is the hypotenuse?`,
          feedbackCorrect: `Exactly — √(${a}² + ${b}²) = ${c} cm.`,
          feedbackDefault: "Square each leg, add them, then take the square root.",
        };
      case "count-squares":
        return {
          a,
          b,
          countSide: "c",
          prompt: "Count the unit squares in the square drawn on the hypotenuse.",
          feedbackCorrect: "Nice counting — that's the area of the hypotenuse square.",
          feedbackDefault: "Count every unit cell inside the highlighted square.",
        };
      case "pick-side":
        return {
          a,
          b,
          prompt: `Tap the ${targetSide === "c" ? "hypotenuse" : targetSide === "a" ? "bottom leg" : "vertical leg"} of the triangle.`,
          feedbackCorrect: "That's the one!",
          feedbackDefault: "Look at where the right angle is, then find the requested side.",
        };
      case "multiple-choice":
        return {
          a,
          b,
          prompt: `Which length is the hypotenuse of a right triangle with legs ${a} and ${b}?`,
          feedbackCorrect: `Right — it's ${c}.`,
          feedbackDefault: "Use a² + b² = c² and take the square root.",
        };
      case "tile-expression":
        return {
          a,
          b,
          prompt: `Complete the Pythagorean relationship for legs ${a} and ${b}.`,
          feedbackCorrect: "Perfect — that's the theorem.",
          feedbackDefault: "Place the two leg lengths into the squared slots.",
        };
    }
  })();

  const step = assemble(proposal, { kind, difficulty, targetSide, rng });
  if (!verify(step)) {
    // Should never happen for triples; surface loudly if it does.
    throw new Error(`fallback failed verification for kind=${kind}`);
  }
  return step;
}
