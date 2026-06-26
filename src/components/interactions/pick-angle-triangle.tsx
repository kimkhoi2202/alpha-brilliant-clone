import { useState } from "react";
import type { KeyboardEvent } from "react";

import type { TriangleSide, TriangleVertex } from "../../content/types";
import { cn } from "../../lib/cn";

type Pt = { x: number; y: number };
type Anchor = "start" | "middle" | "end";

/** Grading lifecycle, mirroring the lesson runner's StepPhase. */
export type PickAnglePhase = "answering" | "correct" | "wrong" | "revealed";

export interface PickAngleTriangleProps {
  /** Leg lengths used to draw the figure. */
  a: number;
  b: number;
  /** Currently selected corner (controlled, single-pick). */
  selected: TriangleVertex | null;
  phase: PickAnglePhase;
  /** Friendly names revealed in the caption (defaults: bottom-left / bottom-right / top). */
  vertexNames?: Partial<Record<TriangleVertex, string>>;
  /** Caption shown while nothing is selected. */
  emptyHint?: string;
  onSelect: (vertex: TriangleVertex) => void;
  className?: string;
}

const DEFAULT_NAMES: Record<TriangleVertex, string> = {
  A: "bottom-left",
  B: "bottom-right",
  C: "top",
};

/**
 * Identify a triangle corner by tapping it directly on the figure, the vertex
 * analog of PickSideTriangle, used for "where is the right angle?" style
 * questions. Tapping a corner selects it (it never locks in - the learner
 * confirms with "Check").
 *
 * Because the corner *is* the answer, the right-angle marker stays hidden while
 * answering and is only revealed once the pick is graded correct/revealed. Emil-
 * aligned: fat (transparent) hit targets for touch, hover/focus only brightens,
 * real focusable buttons with keyboard support, verdict shown by colour plus the
 * lesson's feedback toast.
 */
export function PickAngleTriangle({
  a,
  b,
  selected,
  phase,
  vertexNames,
  emptyHint = "Tap a corner to choose it.",
  onSelect,
  className,
}: PickAngleTriangleProps) {
  const [active, setActive] = useState<TriangleVertex | null>(null);
  const locked = phase !== "answering";
  const names = { ...DEFAULT_NAMES, ...vertexNames };

  // Geometry mirrors RightTriangleFigure / PickSideTriangle: A bottom-left
  // (right angle), B bottom-right, C top-left.
  const u = 200 / Math.max(a, b);
  const pad = 30;
  const width = a * u + pad * 2;
  const height = b * u + pad * 2;
  const map = (p: Pt): Pt => ({ x: p.x * u + pad, y: (b - p.y) * u + pad });
  const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });

  const As = map({ x: 0, y: 0 });
  const Bs = map({ x: a, y: 0 });
  const Cs = map({ x: 0, y: b });
  const sw = Math.max(2.5, u * 0.02);
  const fontSize = Math.max(13, u * 0.16);
  const r = Math.max(8, u * 0.075);

  // Right-angle marker at A: revealed only once graded right (it's the answer).
  const m = Math.min(a, b) * 0.16;
  const corner = [map({ x: m, y: 0 }), map({ x: m, y: m }), map({ x: 0, y: m })];
  const showMarker = phase === "correct" || phase === "revealed";

  const SIDE = "color-mix(in srgb, var(--foreground) 72%, var(--background))";
  const DIM = "color-mix(in srgb, var(--foreground) 55%, var(--background))";
  const DIM_GRADED = "color-mix(in srgb, var(--foreground) 32%, var(--background))";

  const colorOf = (id: TriangleVertex): string => {
    if (!locked) {
      if (selected === id) return "var(--accent)";
      if (active === id) return "var(--foreground)";
      return DIM;
    }
    // Wrong: flag only the learner's pick (gold); never reveal the right corner.
    if (phase === "wrong") return selected === id ? "var(--warning)" : DIM_GRADED;
    // Correct / revealed: the selection is the right corner, show it green.
    return selected === id ? "var(--success)" : DIM_GRADED;
  };

  const verts: { id: TriangleVertex; p: Pt }[] = [
    { id: "A", p: As },
    { id: "B", p: Bs },
    { id: "C", p: Cs },
  ];
  // Paint the hovered/selected corner last so its dot sits above its neighbours.
  const z = (id: TriangleVertex) => (id === active ? 2 : selected === id ? 1 : 0);
  const painted = [...verts].sort((p, q) => z(p.id) - z(q.id));

  const labels: Record<
    TriangleSide,
    { x: number; y: number; anchor: Anchor; baseline?: "central" }
  > = {
    a: { x: mid(As, Bs).x, y: mid(As, Bs).y + fontSize * 1.1, anchor: "middle" },
    b: {
      x: mid(As, Cs).x - fontSize * 0.7,
      y: mid(As, Cs).y,
      anchor: "end",
      baseline: "central",
    },
    c: {
      x: mid(Bs, Cs).x + fontSize * 0.5,
      y: mid(Bs, Cs).y - fontSize * 0.5,
      anchor: "start",
    },
  };

  const onKey = (id: TriangleVertex) => (event: KeyboardEvent) => {
    if (locked) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  };

  let caption = emptyHint;
  let captionClass = "text-muted";
  if (selected) {
    caption = `The ${names[selected]} corner`;
    if (!locked) captionClass = "text-accent-soft-foreground";
    else captionClass = phase === "wrong" ? "text-warning" : "text-success";
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`}
        className="h-auto w-full max-w-[300px] overflow-visible"
        style={{ touchAction: "manipulation" }}
        role="group"
        aria-label="Right triangle: tap the corner with the right angle"
      >
        <polygon
          points={`${As.x},${As.y} ${Bs.x},${Bs.y} ${Cs.x},${Cs.y}`}
          fill="color-mix(in srgb, var(--foreground), transparent 93%)"
          pointerEvents="none"
        />
        {/* Static triangle outline (the figure; corners are what's tappable). */}
        {(
          [
            [As, Bs],
            [As, Cs],
            [Bs, Cs],
          ] as const
        ).map(([p1, p2], i) => (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke={SIDE}
            strokeWidth={sw}
            strokeLinecap="round"
            pointerEvents="none"
          />
        ))}

        {showMarker ? (
          <polyline
            points={corner.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
            fill="none"
            stroke="var(--success)"
            strokeWidth={sw}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ) : null}

        <g fontSize={fontSize} fontWeight={700}>
          {(["a", "b", "c"] as const).map((id) => (
            <text
              key={id}
              x={labels[id].x}
              y={labels[id].y}
              textAnchor={labels[id].anchor}
              dominantBaseline={labels[id].baseline}
              pointerEvents="none"
              style={{ fill: SIDE }}
            >
              {id}
            </text>
          ))}
        </g>

        {painted.map(({ id, p }) => {
          const on = selected === id || active === id;
          const filled = selected === id;
          // Once graded, the right-angle marker (□) is revealed at corner A: hide
          // that corner's dot so the marker stays unobstructed instead of being
          // covered by the green fill. Pre-grade the dot remains the tap target.
          const hideDot = showMarker && id === "A";
          return (
            <g
              key={id}
              role="button"
              tabIndex={locked ? -1 : 0}
              aria-pressed={selected === id}
              aria-label={`${names[id]} corner`}
              onClick={() => !locked && onSelect(id)}
              onKeyDown={onKey(id)}
              onPointerEnter={() => !locked && setActive(id)}
              onPointerLeave={() => setActive((cur) => (cur === id ? null : cur))}
              onFocus={() => !locked && setActive(id)}
              onBlur={() => setActive((cur) => (cur === id ? null : cur))}
              className={cn("outline-none", !locked && "cursor-pointer")}
            >
              <circle cx={p.x} cy={p.y} r={24} fill="transparent" />
              {hideDot ? null : (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={on ? r * 1.25 : r}
                  fill={filled ? colorOf(id) : "var(--background)"}
                  stroke={colorOf(id)}
                  strokeWidth={sw}
                  className="transition-[r,fill,stroke] duration-150 ease-out motion-reduce:transition-none"
                />
              )}
            </g>
          );
        })}
      </svg>

      <p className={cn("text-sm font-medium", captionClass)} aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
