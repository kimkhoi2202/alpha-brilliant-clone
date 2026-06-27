/**
 * The LessonCanvas contract + canvas-control tools (PRD-phase-2 §3.3 extension:
 * "let Koji manipulate the lesson canvas — show, don't just say").
 *
 * ===========================================================================
 *  THE CONTRACT (read this before implementing a new interaction's handle)
 * ===========================================================================
 *
 * Koji can drive the *currently-mounted* interaction's figure: highlight a part,
 * tag it with a label, pulse it for attention, clear annotations, and pre-fill
 * the learner's in-progress answer (NEVER submit — the learner always presses
 * Check). This is UI-framework-agnostic on purpose, exactly like `KojiReactions`:
 * the tools layer declares a plain imperative interface, and the host (the lesson
 * player) wires a live implementation into `ToolContext.canvas`.
 *
 * There are TWO halves to the contract:
 *
 *  1. `CanvasComponentHandle` — the VISUAL half, implemented by each interaction
 *     COMPONENT and published through a ref (the `KojiReactions` / `KojiHandle`
 *     pattern: a `canvasRef?: RefObject<CanvasComponentHandle | null>` prop, set
 *     in a `useEffect` and nulled on unmount). It owns the figure's geometry, so
 *     it knows how to color a side, place a tag, and pulse a part.
 *
 *  2. `LessonCanvas` — the FULL surface on `ToolContext`, assembled at the HOST.
 *     Its visual ops delegate to the mounted component's `CanvasComponentHandle`
 *     (no-op when none is mounted); its `prefillAnswer` is host-owned and routes
 *     to the lesson player's answer setter via `parseCanvasValue` (below).
 *
 * `ToolContext.canvas` is `LessonCanvas | null`: null when AI is off OR no
 * interactive component is mounted (a concept step), so every canvas tool no-ops
 * safely.
 *
 * ---------------------------------------------------------------------------
 *  IMPLEMENTING A NEW INTERACTION (the 5 sibling interactions)
 * ---------------------------------------------------------------------------
 *  a) Decide the component's TARGETS — the stable ids Koji highlights by. Ids are
 *     short, kebab-case, and meaningful (`side-c`, `angle-right`, `point-origin`,
 *     `bar-3`, `cell-area`). `role` is the semantic kind ("hypotenuse", "leg",
 *     "right-angle", "axis", "point"); `label` is an optional human caption.
 *     Add the same list to `canvasTargetsFor` so the agent is grounded in them.
 *  b) Implement `CanvasComponentHandle` in the component and publish it via a
 *     `canvasRef` prop (see `pick-side-triangle.tsx` for the worked reference):
 *       - `listTargets()`   → your CanvasTarget[] (the runtime source of truth)
 *       - `highlight(id, o)` → tint that part with `o.color` (default "accent")
 *       - `label(id, text)`  → draw a small tag near that part
 *       - `point(id)`        → pulse it (respect `prefers-reduced-motion`)
 *       - `clear()`          → remove all of the above
 *     Map `CanvasColor` → theme tokens (`var(--accent)`, `var(--warning)`, …);
 *     keep annotations an ADDITIVE overlay that never disturbs the grading visuals.
 *  c) The HOST already handles `prefillAnswer` for every interaction kind via
 *     `parseCanvasValue` — you only extend that switch if your interaction needs a
 *     new answer shape. The host also passes your `canvasRef` and clears it on
 *     step change; you do not wire any of that yourself.
 *
 * No JSX / React imports here — this stays a plain interface + pure helpers, so
 * the text agent and the realtime voice agent share one canvas catalog.
 */
import { z } from "zod";

import type {
  AnswerValue,
  GridPoint,
  Interaction,
  InteractionKind,
  TriangleSide,
  TriangleVertex,
} from "../../../content/types";
import { defineTool } from "./registry";

// ---------------------------------------------------------------------------
// Targets & colors — the vocabulary Koji uses to address a figure.
// ---------------------------------------------------------------------------

/**
 * A stable, addressable part of the current interaction's figure.
 *  - `id`    short kebab-case handle Koji highlights by (e.g. "side-c"). Stable
 *            across renders so the model can reference it without guessing.
 *  - `role`  semantic kind of the part ("hypotenuse", "leg", "right-angle", …).
 *  - `label` optional human caption (e.g. "side c"); used as a default tag text.
 */
export interface CanvasTarget {
  id: string;
  role: string;
  label?: string;
}

/**
 * The pedagogical colors Koji can paint with, mapped (by each component) to the
 * app's existing theme tokens: accent (brand blue), warning (gold), success
 * (green), danger (red), muted (low-emphasis). Keep the palette this small so
 * highlights read consistently across every interaction.
 */
export type CanvasColor = "accent" | "warning" | "success" | "danger" | "muted";

/** Options for a highlight: the tint and an optional tag drawn with it. */
export interface CanvasHighlightOptions {
  color?: CanvasColor;
  label?: string;
}

// ---------------------------------------------------------------------------
// The imperative handles — the component half and the full host surface.
// ---------------------------------------------------------------------------

/**
 * The VISUAL handle each interaction COMPONENT implements and publishes through
 * its `canvasRef`. All ops are synchronous and idempotent; calling one with an
 * unknown `targetId` is a safe no-op. `listTargets()` is the runtime source of
 * truth for which ids exist right now.
 */
export interface CanvasComponentHandle {
  /** The parts Koji can address on the current figure (stable ids/roles). */
  listTargets(): CanvasTarget[];
  /** Tint a part (default color "accent"); an optional label tags it too. */
  highlight(targetId: string, opts?: CanvasHighlightOptions): void;
  /** Draw a small text tag near a part (e.g. "hypotenuse"). */
  label(targetId: string, text: string): void;
  /** Pulse a part to draw attention (no-op pulse under reduced motion). */
  point(targetId: string): void;
  /** Remove every highlight, label, and pulse. */
  clear(): void;
}

/**
 * The full canvas surface handed to the tools via `ToolContext.canvas`. It is
 * the component's visual handle PLUS the host-owned `prefillAnswer`. The host
 * assembles it so visual ops delegate to the mounted component (no-op if none)
 * and `prefillAnswer` routes to the lesson player's answer state.
 */
export interface LessonCanvas extends CanvasComponentHandle {
  /**
   * Set the learner's IN-PROGRESS answer from a string the host parses per the
   * current interaction kind (see `parseCanvasValue`). NEVER submits or grades —
   * the learner still presses Check. A value that doesn't parse is ignored.
   */
  prefillAnswer(value: string): void;
}

// ---------------------------------------------------------------------------
// Target catalogs — the canonical targets per interaction (the reference set).
// ---------------------------------------------------------------------------

/**
 * The canonical targets for a right-triangle tap interaction (pick-side /
 * pick-sides). Shared by `PickSideTriangle.listTargets()` and `canvasTargetsFor`
 * so the runtime handle and the agent grounding can never drift. Roles are
 * orientation-independent: `a`/`b` are always legs, `c` is always the hypotenuse.
 */
export const TRIANGLE_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "side-a", role: "leg", label: "side a" },
  { id: "side-b", role: "leg", label: "side b" },
  { id: "side-c", role: "hypotenuse", label: "side c" },
  { id: "angle-right", role: "right-angle", label: "right angle" },
];

/**
 * Targets for the pick-angle interaction — mirrors `ANGLE_CANVAS_TARGETS` in
 * `pick-angle-triangle.tsx`. The right angle is fixed at vertex A; B and C are
 * the two acute corners. Hardcoded here (not imported from the `.tsx`) so this
 * catalog stays framework-agnostic; `PickAngleTriangle.listTargets()` is the
 * runtime source of truth.
 */
const ANGLE_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "angle-a", role: "right-angle", label: "angle A" },
  { id: "angle-b", role: "angle", label: "angle B" },
  { id: "angle-c", role: "angle", label: "angle C" },
];

/**
 * Targets for the count-squares interaction — mirrors `COUNT_SQUARES_CANVAS_TARGETS`
 * in `count-squares-figure.tsx`: the three squares of the a² + b² = c² area proof
 * (`square-a` / `square-b` on the legs, `square-c` on the hypotenuse).
 */
const COUNT_SQUARES_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "square-a", role: "square", label: "a²" },
  { id: "square-b", role: "square", label: "b²" },
  { id: "square-c", role: "square", label: "c²" },
];

/**
 * The STABLE targets for the plot-points grid — mirrors the always-present anchors
 * in `plot-points-grid.tsx` (`axis-x`, `axis-y`, `origin`). The data-derived
 * `point-N` / `target` ids only exist at runtime, so `listCanvasTargets` stays the
 * source of truth for those; this static hint grounds the three fixed anchors.
 */
const GRID_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "axis-x", role: "axis", label: "x-axis" },
  { id: "axis-y", role: "axis", label: "y-axis" },
  { id: "origin", role: "origin", label: "origin" },
];

/**
 * Targets for the numeric interaction — mirrors `ANSWER_CANVAS_TARGETS` in
 * `numeric-input.tsx`: a single free-entry field with no sub-parts.
 */
const ANSWER_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "answer-field", role: "answer-field", label: "answer" },
];

/**
 * Targets for the slider interaction — mirrors `SLIDER_CANVAS_TARGETS` in
 * `slider-input.tsx`: the whole control, its track, and its draggable handle.
 */
const SLIDER_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "slider", role: "slider", label: "the slider" },
  { id: "slider-track", role: "track", label: "the track" },
  { id: "slider-handle", role: "handle", label: "the handle" },
];

/**
 * The targets the agent is grounded in for a given interaction kind — a static
 * hint so the model can highlight by id immediately (the `listCanvasTargets`
 * tool remains the live source of truth). Mirrors each component's local targets
 * const. Kinds without an interactive figure (multiple-choice, multi-select,
 * categorize, tap-bar, tile-expression) return `[]`.
 */
export function canvasTargetsFor(kind: InteractionKind): readonly CanvasTarget[] {
  switch (kind) {
    case "pick-side":
    case "pick-sides":
      return TRIANGLE_CANVAS_TARGETS;
    case "pick-angle":
      return ANGLE_CANVAS_TARGETS;
    case "count-squares":
      return COUNT_SQUARES_CANVAS_TARGETS;
    case "plot-points":
      return GRID_CANVAS_TARGETS;
    case "numeric":
      return ANSWER_CANVAS_TARGETS;
    case "slider":
      return SLIDER_CANVAS_TARGETS;
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// prefillAnswer parsing — string → AnswerValue, by interaction kind.
// ---------------------------------------------------------------------------

/**
 * Split a list value on commas / semicolons / whitespace into trimmed tokens.
 * Lets Koji prefill multi-part answers ("a, b" or "t1->right, t2->not").
 */
function splitList(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Unique-preserving filter for small arrays. */
function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

/** Parse a triangle side from "a" / "side-a" / "A" (tolerant of the target id). */
function parseSide(value: string): TriangleSide | null {
  const v = value.trim().toLowerCase().replace(/^side[-\s]?/, "");
  return v === "a" || v === "b" || v === "c" ? (v as TriangleSide) : null;
}

/** Parse a triangle vertex from "A" / "vertex-A" (tolerant of the target id). */
function parseVertex(value: string): TriangleVertex | null {
  const v = value.trim().toUpperCase().replace(/^(?:VERTEX|ANGLE)[-\s]?/, "");
  return v === "A" || v === "B" || v === "C" ? (v as TriangleVertex) : null;
}

/** Match a choice/bar by its id (exact, case-insensitive) or its label. */
function matchOptionId(
  options: readonly { id: string; label: string }[],
  value: string,
): string | null {
  const v = value.trim().toLowerCase();
  const byId = options.find((o) => o.id.toLowerCase() === v);
  if (byId) return byId.id;
  const byLabel = options.find((o) => o.label.toLowerCase() === v);
  return byLabel ? byLabel.id : null;
}

/** Parse a finite number; null if it isn't one. */
function parseNumber(value: string): number | null {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

/** Parse "(x, y); (x, y)" / "x,y" point lists into integer grid points. */
function parsePoints(value: string): GridPoint[] {
  const points: GridPoint[] = [];
  const matches = value.matchAll(/-?\d+(?:\.\d+)?\s*[,\s]\s*-?\d+(?:\.\d+)?/g);
  for (const match of matches) {
    const [x, y] = match[0].split(/[,\s]+/).map((n) => Number(n.trim()));
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
  }
  return points;
}

/** Parse "item->bin, item->bin" into a placement map over known item ids. */
function parsePlacement(
  value: string,
  interaction: Extract<Interaction, { kind: "categorize" }>,
): Record<string, string | null> | null {
  const placement: Record<string, string | null> = Object.fromEntries(
    interaction.items.map((item) => [item.id, null]),
  );
  let matched = 0;
  for (const pair of splitList(value)) {
    const [rawItem, rawBin] = pair.split(/->|:/).map((s) => s?.trim() ?? "");
    const item = interaction.items.find(
      (it) => it.id.toLowerCase() === rawItem.toLowerCase(),
    );
    const bin = interaction.bins.find(
      (b) => b.id.toLowerCase() === rawBin.toLowerCase(),
    );
    if (item && bin) {
      placement[item.id] = bin.id;
      matched += 1;
    }
  }
  return matched > 0 ? placement : null;
}

/**
 * Parse a prefill string into the typed `AnswerValue` for the given interaction,
 * or `null` when it doesn't parse (the canvas then ignores it). This is the
 * single, centralized "string → answer" mapping referenced by the contract:
 *
 *   numeric / slider / count-squares → a number ("5", "5.0")
 *   pick-side                        → a side: "a" | "b" | "c" (or "side-c")
 *   pick-sides                       → a side list: "a, b"
 *   pick-angle                       → a vertex: "A" | "B" | "C"
 *   multiple-choice / tap-bar        → a choice/bar id OR its label
 *   multi-select                     → a list of choice ids/labels
 *   tile-expression                  → the blanks' tokens in order: "a², b², c²"
 *   plot-points                      → point list: "(3, 4); (1, 2)"
 *   categorize                       → "item->bin, item->bin"
 *
 * Pure + framework-agnostic, so it is shared by the host and easily unit-tested.
 */
export function parseCanvasValue(
  interaction: Interaction,
  raw: string,
): AnswerValue | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value.length === 0) return null;

  switch (interaction.kind) {
    case "numeric": {
      const n = parseNumber(value);
      return n === null ? null : { kind: "numeric", value: n };
    }
    case "slider": {
      const n = parseNumber(value);
      return n === null ? null : { kind: "slider", value: n };
    }
    case "count-squares": {
      const n = parseNumber(value);
      return n === null ? null : { kind: "count-squares", value: n };
    }
    case "pick-side": {
      const side = parseSide(value);
      return side ? { kind: "pick-side", side } : null;
    }
    case "pick-sides": {
      const sides = dedupe(
        splitList(value)
          .map(parseSide)
          .filter((s): s is TriangleSide => s !== null),
      );
      return sides.length > 0 ? { kind: "pick-sides", sides } : null;
    }
    case "pick-angle": {
      const vertex = parseVertex(value);
      return vertex ? { kind: "pick-angle", vertex } : null;
    }
    case "multiple-choice": {
      const choiceId = matchOptionId(interaction.choices, value);
      return choiceId ? { kind: "multiple-choice", choiceId } : null;
    }
    case "multi-select": {
      const choiceIds = dedupe(
        splitList(value)
          .map((token) => matchOptionId(interaction.choices, token))
          .filter((id): id is string => id !== null),
      );
      return choiceIds.length > 0 ? { kind: "multi-select", choiceIds } : null;
    }
    case "tap-bar": {
      const barId = matchOptionId(interaction.bars, value);
      return barId ? { kind: "tap-bar", barId } : null;
    }
    case "tile-expression": {
      const tokens = splitList(value);
      const blanks = interaction.template.filter((t) => t === null).length;
      if (tokens.length !== blanks) return null;
      if (!tokens.every((t) => interaction.tiles.includes(t))) return null;
      return { kind: "tile-expression", filled: tokens };
    }
    case "plot-points": {
      const points = parsePoints(value);
      return points.length > 0
        ? { kind: "plot-points", points: points.slice(0, interaction.targets.length) }
        : null;
    }
    case "categorize": {
      const placement = parsePlacement(value, interaction);
      return placement ? { kind: "categorize", placement } : null;
    }
  }
}

// ---------------------------------------------------------------------------
// Tool results + the canvas catalog (added to `appTools`, shared by both agents).
// ---------------------------------------------------------------------------

/** Result of a visual canvas op (highlight / label / point). */
export interface CanvasOpResult {
  ok: boolean;
  /** The target acted on, echoed back for the model. */
  targetId?: string;
  reason?: string;
}

/** Result of `listCanvasTargets`: the parts Koji can address right now. */
export interface ListTargetsResult {
  ok: boolean;
  targets: CanvasTarget[];
  reason?: string;
}

/** Why a canvas tool is inert (AI off, or no interactive figure mounted). */
const CANVAS_UNAVAILABLE =
  "No interactive figure is on screen right now, so there's nothing to annotate.";

/** True only when annotations can actually be drawn (AI on + a mounted figure). */
function canvasOf(ctx: { aiEnabled: boolean; canvas: LessonCanvas | null }) {
  return ctx.aiEnabled ? ctx.canvas : null;
}

const colorParam = z
  .enum(["accent", "warning", "success", "danger", "muted"])
  .optional();

export const listCanvasTargets = defineTool({
  name: "listCanvasTargets",
  description:
    "List the parts of the current figure you can point at (their ids, roles, and labels), " +
    "e.g. the triangle's sides and right angle. Call this first so you highlight by a real id.",
  parameters: z.object({}),
  handler: (_args, ctx): ListTargetsResult => {
    const canvas = canvasOf(ctx);
    if (!canvas) return { ok: false, targets: [], reason: CANVAS_UNAVAILABLE };
    return { ok: true, targets: canvas.listTargets() };
  },
});

export const highlightElement = defineTool({
  name: "highlightElement",
  description:
    "Tint a part of the current figure to draw the learner's eye to it (e.g. color a side). " +
    "Use a stable id from listCanvasTargets. Optional color (accent/warning/success/danger/muted) " +
    "and an optional short label. Highlighting a part is teaching — it is not revealing the answer.",
  parameters: z.object({
    targetId: z.string().min(1),
    color: colorParam,
    label: z.string().max(40).optional(),
  }),
  handler: (args, ctx): CanvasOpResult => {
    const canvas = canvasOf(ctx);
    if (!canvas) return { ok: false, reason: CANVAS_UNAVAILABLE };
    canvas.highlight(args.targetId, { color: args.color, label: args.label });
    return { ok: true, targetId: args.targetId };
  },
});

export const labelElement = defineTool({
  name: "labelElement",
  description:
    "Tag a part of the current figure with a short text label (e.g. 'hypotenuse'). " +
    "Use a stable id from listCanvasTargets. Keep labels to a word or two.",
  parameters: z.object({
    targetId: z.string().min(1),
    text: z.string().min(1).max(40),
  }),
  handler: (args, ctx): CanvasOpResult => {
    const canvas = canvasOf(ctx);
    if (!canvas) return { ok: false, reason: CANVAS_UNAVAILABLE };
    canvas.label(args.targetId, args.text);
    return { ok: true, targetId: args.targetId };
  },
});

export const pointToElement = defineTool({
  name: "pointToElement",
  description:
    "Pulse a part of the current figure to draw attention to it (a gentle 'look here'). " +
    "Use a stable id from listCanvasTargets.",
  parameters: z.object({ targetId: z.string().min(1) }),
  handler: (args, ctx): CanvasOpResult => {
    const canvas = canvasOf(ctx);
    if (!canvas) return { ok: false, reason: CANVAS_UNAVAILABLE };
    canvas.point(args.targetId);
    return { ok: true, targetId: args.targetId };
  },
});

export const clearAnnotations = defineTool({
  name: "clearAnnotations",
  description:
    "Remove every highlight, label, and pulse you've drawn on the current figure " +
    "(e.g. to reset before guiding a different part).",
  parameters: z.object({}),
  handler: (_args, ctx): CanvasOpResult => {
    const canvas = canvasOf(ctx);
    if (!canvas) return { ok: false, reason: CANVAS_UNAVAILABLE };
    canvas.clear();
    return { ok: true };
  },
});

export const prefillAnswer = defineTool({
  name: "prefillAnswer",
  description:
    "Pre-fill the learner's in-progress answer in the figure WITHOUT submitting it — they still " +
    "press Check. `value` is parsed for the current interaction (a side like 'c', a number, a " +
    "choice id, etc.). Only do this when the learner asks you to set it up for them; never fill in " +
    "an answer you computed yourself (that is what revealSolution is for).",
  parameters: z.object({ value: z.string().min(1).max(120) }),
  handler: (args, ctx): CanvasOpResult => {
    const canvas = canvasOf(ctx);
    if (!canvas) return { ok: false, reason: CANVAS_UNAVAILABLE };
    canvas.prefillAnswer(args.value);
    // The host no-ops on an unparseable value; we report the attempt either way.
    return { ok: true, reason: "Filled the in-progress answer — the learner still presses Check." };
  },
});
