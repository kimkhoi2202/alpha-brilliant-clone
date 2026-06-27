import { useEffect, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";

import type { TriangleSide, TriangleVertex } from "../../content/types";
import type {
  CanvasColor,
  CanvasComponentHandle,
  CanvasTarget,
} from "../../lib/ai/tools/canvas";
import { cn } from "../../lib/cn";

type Pt = { x: number; y: number };
type Anchor = "start" | "middle" | "end";

/** One Koji annotation on a target: a tint, a tag, and/or an attention pulse. */
type CanvasAnnotation = { color?: CanvasColor; label?: string; point?: boolean };

/** Map the contract's pedagogical colors onto the app's theme tokens. */
const CANVAS_COLOR_VAR: Record<CanvasColor, string> = {
  accent: "var(--accent)",
  warning: "var(--warning)",
  success: "var(--success)",
  danger: "var(--danger)",
  muted: "var(--muted)",
};

/**
 * The angles Koji can address on this figure (the runtime source of truth for
 * listTargets, mirrored into `canvasTargetsFor` at the host). The geometry fixes
 * the right angle at vertex A (bottom-left), so its role is "right-angle"; the
 * two acute corners B and C are plain "angle"s.
 */
const ANGLE_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "angle-a", role: "right-angle", label: "angle A" },
  { id: "angle-b", role: "angle", label: "angle B" },
  { id: "angle-c", role: "angle", label: "angle C" },
];

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
  /**
   * Koji's canvas handle sink (the `KojiReactions` pattern). When provided, the
   * component publishes its `CanvasComponentHandle` here so the host's
   * `LessonCanvas` can highlight / label / point at the triangle's angles (the
   * right angle A and the two acute angles B, C). Omit (or pass undefined) and
   * the component is byte-for-byte its old self — no handle, no annotations.
   */
  canvasRef?: RefObject<CanvasComponentHandle | null>;
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
  canvasRef,
  className,
}: PickAngleTriangleProps) {
  const [active, setActive] = useState<TriangleVertex | null>(null);
  // Koji's annotations (highlight / label / point), keyed by target id. Additive
  // overlay only — never disturbs the selection / grading visuals below.
  const [annotations, setAnnotations] = useState<Record<string, CanvasAnnotation>>(
    {},
  );
  const locked = phase !== "answering";
  const names = { ...DEFAULT_NAMES, ...vertexNames };

  // Publish the canvas handle so Koji's tools can drive the figure. Visual ops
  // are pure setState (the geometry is read at render time from `annotations`),
  // so the handle is stable and only re-published if the sink ref changes. The
  // host clears annotations on step change and the cleanup nulls the ref on
  // unmount, so highlights never leak across steps.
  useEffect(() => {
    if (!canvasRef) return;
    const handle: CanvasComponentHandle = {
      listTargets: () => ANGLE_CANVAS_TARGETS.map((target) => ({ ...target })),
      highlight: (targetId, opts) =>
        setAnnotations((prev) => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            color: opts?.color ?? prev[targetId]?.color ?? "accent",
            ...(opts?.label !== undefined ? { label: opts.label } : {}),
          },
        })),
      label: (targetId, text) =>
        setAnnotations((prev) => ({
          ...prev,
          [targetId]: { ...prev[targetId], label: text },
        })),
      point: (targetId) =>
        setAnnotations((prev) => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            point: true,
            color: prev[targetId]?.color ?? "accent",
          },
        })),
      clear: () => setAnnotations({}),
    };
    canvasRef.current = handle;
    return () => {
      if (canvasRef.current === handle) canvasRef.current = null;
    };
  }, [canvasRef]);

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

  // Koji's annotation overlay (only present once Koji has drawn something). Each
  // target is an interior angle: the vertex plus its two neighbours, which bound
  // the wedge/arc we tint at that corner.
  const angleGeom: Record<string, { v: Pt; n1: Pt; n2: Pt }> = {
    "angle-a": { v: As, n1: Bs, n2: Cs },
    "angle-b": { v: Bs, n1: As, n2: Cs },
    "angle-c": { v: Cs, n1: As, n2: Bs },
  };
  const annotationEntries = Object.entries(annotations);
  const arcR = Math.min(42, Math.max(14, Math.min(a, b) * u * 0.2));
  const tagFont = Math.max(11, fontSize * 0.8);
  const unit = (p: Pt, q: Pt): Pt => {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  };
  // Build the filled wedge + bounding arc for an interior angle, plus the point
  // (outward along the bisector) where its tag sits clear of the figure.
  const angleArc = (geom: { v: Pt; n1: Pt; n2: Pt }) => {
    const d1 = unit(geom.v, geom.n1);
    const d2 = unit(geom.v, geom.n2);
    const p1 = { x: geom.v.x + d1.x * arcR, y: geom.v.y + d1.y * arcR };
    const p2 = { x: geom.v.x + d2.x * arcR, y: geom.v.y + d2.y * arcR };
    // Sweep toward the interior: the short arc between the two edge rays.
    const sweep = d1.x * d2.y - d1.y * d2.x > 0 ? 1 : 0;
    const e1 = `${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    const e2 = `${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    const radii = `${arcR.toFixed(1)} ${arcR.toFixed(1)}`;
    const arc = `M ${e1} A ${radii} 0 0 ${sweep} ${e2}`;
    const wedge = `M ${geom.v.x.toFixed(1)} ${geom.v.y.toFixed(1)} L ${e1} A ${radii} 0 0 ${sweep} ${e2} Z`;
    const bx = d1.x + d2.x;
    const by = d1.y + d2.y;
    const bl = Math.hypot(bx, by) || 1;
    const off = arcR + tagFont * 1.1;
    const tagAt = { x: geom.v.x - (bx / bl) * off, y: geom.v.y - (by / bl) * off };
    return { arc, wedge, tagAt };
  };
  // A small rounded tag near a part, tinted to match its highlight.
  const tag = (cx: number, cy: number, text: string, colorVar: string) => {
    const w = text.length * tagFont * 0.62 + tagFont;
    const h = tagFont * 1.7;
    return (
      <g pointerEvents="none">
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          rx={h / 2}
          fill={`color-mix(in srgb, ${colorVar} 20%, var(--background))`}
          stroke={colorVar}
          strokeWidth={1}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={tagFont}
          fontWeight={700}
          style={{ fill: colorVar }}
        >
          {text}
        </text>
      </g>
    );
  };

  // Resolve each annotation to its geometry + style ONCE so the attention layer
  // (wedge + arc + pulse) can paint BEHIND the triangle while the text tag is
  // drawn separately on top. Z-FIX: the sides + right-angle marker must stay
  // legible, so the pulse sits behind the geometry, never over the line work.
  const resolvedAnnotations = annotationEntries
    .map(([targetId, ann]) => {
      const geom = angleGeom[targetId];
      if (!geom) return null;
      const colorVar = CANVAS_COLOR_VAR[ann.color ?? "accent"];
      const showStroke = ann.color !== undefined || ann.point === true;
      const pulse = ann.point ? "koji-canvas-pulse" : undefined;
      const { arc, wedge, tagAt } = angleArc(geom);
      return { targetId, label: ann.label, colorVar, showStroke, pulse, arc, wedge, tagAt };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

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

        {/* Koji's attention layer (wedge + arc + pulse), painted BEHIND the
            triangle so the sides and the right-angle marker always stay on top
            and legible. The matching text tags are drawn last, on top (below). */}
        {resolvedAnnotations.length > 0 ? (
          <g aria-hidden>
            {resolvedAnnotations.map((a) =>
              a.showStroke ? (
                <g key={a.targetId} className={a.pulse} pointerEvents="none">
                  <path
                    d={a.wedge}
                    fill={`color-mix(in srgb, ${a.colorVar} 22%, var(--background))`}
                    stroke="none"
                  />
                  <path
                    d={a.arc}
                    fill="none"
                    stroke={a.colorVar}
                    strokeWidth={sw * 1.8}
                    strokeLinecap="round"
                  />
                </g>
              ) : null,
            )}
          </g>
        ) : null}

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

        {/* Koji's annotation TAGS — drawn last so the label text stays readable
            above the figure. The attention wedge/arc/pulse is painted behind the
            triangle (above); only the text tag sits on top. Never interactive
            (pointerEvents none), so taps still land on the corner hit areas. */}
        {resolvedAnnotations.length > 0 ? (
          <g aria-hidden>
            {resolvedAnnotations.map((a) =>
              a.label ? (
                <g key={a.targetId}>{tag(a.tagAt.x, a.tagAt.y, a.label, a.colorVar)}</g>
              ) : null,
            )}
          </g>
        ) : null}
      </svg>

      <p className={cn("text-sm font-medium", captionClass)} aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
