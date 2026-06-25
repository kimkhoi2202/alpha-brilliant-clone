import { useState } from "react";
import type { KeyboardEvent } from "react";

import type { TriangleOrientation, TriangleSide } from "../../content/types";
import { cn } from "../../lib/cn";

type Pt = { x: number; y: number };
type Anchor = "start" | "middle" | "end";

/** Grading lifecycle, mirroring the lesson runner's StepPhase. */
export type PickSidePhase = "answering" | "correct" | "wrong" | "revealed";

export interface PickSideTriangleProps {
  /** Leg lengths used to draw the figure. */
  a: number;
  b: number;
  /**
   * Which way the figure faces. "normal" (default): right angle bottom-left,
   * a = bottom leg, b = left vertical leg, c = hypotenuse on the right (the
   * classic figure, matching PickAngleTriangle / RightTriangleFigure).
   * "flipped": right angle bottom-right, a = right vertical leg, b = bottom leg,
   * c = hypotenuse on the left (the mirror image).
   */
  orientation?: TriangleOrientation;
  /** Currently selected side(s) (controlled). One for single-pick, more for multi. */
  selected: TriangleSide[];
  /**
   * The full correct set. When provided, graded states reveal *every* correct
   * side (green) and flag wrong picks (gold): the select-all convention. Omit
   * for single-pick, where the chosen side is simply tinted by the phase.
   */
  correctSides?: TriangleSide[];
  phase: PickSidePhase;
  /** Friendly names revealed in the caption (defaults are orientation-aware:
   *  the bottom leg, the vertical leg, and the slanted hypotenuse). */
  sideNames?: Partial<Record<TriangleSide, string>>;
  /** Caption shown while nothing is selected. */
  emptyHint?: string;
  onSelect: (side: TriangleSide) => void;
  className?: string;
}

const ORDER: TriangleSide[] = ["a", "b", "c"];
// Descriptive names depend on orientation: a and b swap which is the vertical
// leg vs the bottom leg when the figure flips. (c is always the slanted one.)
const DEFAULT_NAMES: Record<TriangleOrientation, Record<TriangleSide, string>> = {
  normal: { a: "bottom", b: "vertical", c: "slanted" },
  flipped: { a: "vertical", b: "bottom", c: "slanted" },
};

const sameSet = (x: TriangleSide[], y: TriangleSide[]) =>
  x.length === y.length && x.every((s) => y.includes(s));

function listJoin(arr: string[]): string {
  if (arr.length <= 1) return arr[0] ?? "";
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`;
}

/**
 * Identify triangle side(s) by tapping them directly on the figure, a far more
 * interactive replacement for a multiple-choice / select-all list. Tapping a
 * side selects it and reveals which one you chose; it never locks in - the
 * learner confirms with "Check".
 *
 * Orientation is parameterized via the `orientation` prop. "normal" (default)
 * is the classic figure: right angle bottom-left, a the bottom leg, b the left
 * vertical leg, c the hypotenuse on the right. "flipped" mirrors it: right angle
 * bottom-right, a the right vertical leg, b the bottom leg, c the hypotenuse on
 * the left. The triangle path, a/b/c labels, right-angle box, per-side hit areas
 * and the graded feedback all follow the chosen orientation.
 *
 * Emil-aligned: fat (transparent) hit strokes for touch, hover/focus only
 * brightens (it never enables the answer), real focusable buttons with keyboard
 * support; the verdict is shown by colour plus the lesson's feedback toast. No
 * resting dots at the vertices - a side is just a clean line until tapped.
 */
export function PickSideTriangle({
  a,
  b,
  orientation = "normal",
  selected,
  correctSides,
  phase,
  sideNames,
  emptyHint = "Tap a side to choose it.",
  onSelect,
  className,
}: PickSideTriangleProps) {
  const [active, setActive] = useState<TriangleSide | null>(null);
  const locked = phase !== "answering";
  const names = { ...DEFAULT_NAMES[orientation], ...sideNames };
  const selectedSet = new Set(selected);
  const isSel = (id: TriangleSide) => selectedSet.has(id);

  // Geometry. Both orientations are drawn in the same a x b box; only which
  // corner holds the right angle changes - and with it the side->segment map,
  // the right-angle box, and the label anchors.
  const u = 200 / Math.max(a, b);
  const pad = 26;
  const width = a * u + pad * 2;
  const height = b * u + pad * 2;
  const map = (p: Pt): Pt => ({ x: p.x * u + pad, y: (b - p.y) * u + pad });
  const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const sw = Math.max(2.5, u * 0.02);
  const fontSize = Math.max(13, u * 0.16);
  // Right-angle box leg length (figure units), tucked between the two legs.
  const m = Math.min(a, b) * 0.16;

  type SideGeom = { id: TriangleSide; p1: Pt; p2: Pt };
  type LabelGeom = { x: number; y: number; anchor: Anchor; baseline?: "central" };
  let verts: [Pt, Pt, Pt];
  let sides: SideGeom[];
  let corner: Pt[];
  let labels: Record<TriangleSide, LabelGeom>;

  if (orientation === "flipped") {
    // Right angle bottom-right: BL bottom-left, BR bottom-right (the right
    // angle), TR top-right apex. a = right (vertical) leg, b = bottom leg,
    // c = hypotenuse running up the left. The mirror of the classic figure.
    const BL = map({ x: 0, y: 0 });
    const BR = map({ x: a, y: 0 });
    const TR = map({ x: a, y: b });
    verts = [BL, BR, TR];
    corner = [map({ x: a - m, y: 0 }), map({ x: a - m, y: m }), map({ x: a, y: m })];
    sides = [
      { id: "a", p1: BR, p2: TR },
      { id: "b", p1: BL, p2: BR },
      { id: "c", p1: BL, p2: TR },
    ];
    labels = {
      // bottom leg: centred just below it.
      b: { x: mid(BL, BR).x, y: mid(BL, BR).y + fontSize * 1.1, anchor: "middle" },
      // right vertical leg: to its right.
      a: {
        x: mid(BR, TR).x + fontSize * 0.7,
        y: mid(BR, TR).y,
        anchor: "start",
        baseline: "central",
      },
      // hypotenuse: along its upper-left.
      c: {
        x: mid(BL, TR).x - fontSize * 0.5,
        y: mid(BL, TR).y - fontSize * 0.5,
        anchor: "end",
      },
    };
  } else {
    // Normal (classic) orientation: right angle bottom-left. A bottom-left (the
    // right angle), B bottom-right, C top-left apex. a = bottom leg, b = left
    // (vertical) leg, c = hypotenuse running up the right. Matches
    // PickAngleTriangle / RightTriangleFigure: c to the right, b to the left.
    const A = map({ x: 0, y: 0 });
    const B = map({ x: a, y: 0 });
    const C = map({ x: 0, y: b });
    verts = [A, B, C];
    corner = [map({ x: m, y: 0 }), map({ x: m, y: m }), map({ x: 0, y: m })];
    sides = [
      { id: "a", p1: A, p2: B },
      { id: "b", p1: A, p2: C },
      { id: "c", p1: B, p2: C },
    ];
    labels = {
      // bottom leg: centred just below it.
      a: { x: mid(A, B).x, y: mid(A, B).y + fontSize * 1.1, anchor: "middle" },
      // left vertical leg: to its left.
      b: {
        x: mid(A, C).x - fontSize * 0.7,
        y: mid(A, C).y,
        anchor: "end",
        baseline: "central",
      },
      // hypotenuse: along its upper-right.
      c: {
        x: mid(B, C).x + fontSize * 0.5,
        y: mid(B, C).y - fontSize * 0.5,
        anchor: "start",
      },
    };
  }

  // Paint the hovered/selected side last so it sits above its neighbours: its
  // caps shouldn't be overlapped by another line at a shared vertex.
  const zIndex = (id: TriangleSide) => (id === active ? 2 : isSel(id) ? 1 : 0);
  const painted = [...sides].sort((p, q) => zIndex(p.id) - zIndex(q.id));

  // Opaque greys (mixed with the canvas) rather than translucent white, so the
  // rounded caps where two sides meet don't double up into a brighter dot at
  // each vertex.
  const DIM = "color-mix(in srgb, var(--foreground) 68%, var(--background))";
  const DIM_GRADED = "color-mix(in srgb, var(--foreground) 40%, var(--background))";

  const colorOf = (id: TriangleSide): string => {
    if (!locked) {
      if (isSel(id)) return "var(--accent)";
      if (id === active) return "var(--foreground)";
      return DIM;
    }
    // Wrong: nudge only - flag the learner's wrong picks, but never reveal the
    // correct sides they didn't choose. (Revealing is what "See answer" is for.)
    if (phase === "wrong") {
      if (!isSel(id)) return DIM_GRADED;
      return correctSides?.includes(id) ? "var(--accent)" : "var(--warning)";
    }
    // Correct / revealed: the selection is the correct set, show it green.
    if (isSel(id)) return "var(--success)";
    return DIM_GRADED;
  };
  const strokeOf = (id: TriangleSide) =>
    isSel(id) || id === active ? sw * 1.5 : sw;

  const onKey = (id: TriangleSide) => (event: KeyboardEvent) => {
    if (locked) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  // Caption: reveal which side(s) are chosen, tinted by the verdict once graded.
  const chosen = ORDER.filter((id) => selectedSet.has(id));
  let caption = emptyHint;
  let captionClass = "text-muted";
  if (chosen.length > 0) {
    const word = chosen.length > 1 ? "sides" : "side";
    caption = `The ${listJoin(chosen.map((id) => names[id]))} ${word}`;
    if (!locked) {
      captionClass = "text-accent";
    } else {
      const ok = correctSides
        ? sameSet(chosen, correctSides)
        : phase !== "wrong";
      captionClass = ok ? "text-success" : "text-warning";
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`}
        className="h-auto w-full max-w-[300px] overflow-visible"
        style={{ touchAction: "manipulation" }}
        role="group"
        aria-label="Right triangle: tap a side to choose it"
      >
        <polygon
          points={verts.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(" ")}
          fill="color-mix(in srgb, var(--foreground), transparent 93%)"
          pointerEvents="none"
        />
        <polyline
          points={corner.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
          fill="none"
          stroke="color-mix(in srgb, var(--foreground) 45%, var(--background))"
          strokeWidth={sw * 0.8}
          strokeLinejoin="round"
          pointerEvents="none"
        />

        {painted.map(({ id, p1, p2 }) => (
          <g
            key={id}
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-pressed={isSel(id)}
            aria-label={`${names[id]} side`}
            onClick={() => !locked && onSelect(id)}
            onKeyDown={onKey(id)}
            onPointerEnter={() => !locked && setActive(id)}
            onPointerLeave={() => setActive((cur) => (cur === id ? null : cur))}
            onFocus={() => !locked && setActive(id)}
            onBlur={() => setActive((cur) => (cur === id ? null : cur))}
            className={cn("outline-none", !locked && "cursor-pointer")}
          >
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="transparent"
              strokeWidth={26}
              strokeLinecap="round"
            />
            <line
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={colorOf(id)}
              strokeWidth={strokeOf(id)}
              strokeLinecap="round"
              className="transition-[stroke,stroke-width] duration-150 ease-out motion-reduce:transition-none"
            />
          </g>
        ))}

        <g fontSize={fontSize} fontWeight={700}>
          {sides.map(({ id }) => (
            <text
              key={id}
              x={labels[id].x}
              y={labels[id].y}
              textAnchor={labels[id].anchor}
              dominantBaseline={labels[id].baseline}
              pointerEvents="none"
              style={{ fill: colorOf(id) }}
              className="transition-[fill] duration-150 ease-out motion-reduce:transition-none"
            >
              {id}
            </text>
          ))}
        </g>
      </svg>

      <p className={cn("text-sm font-medium", captionClass)} aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
