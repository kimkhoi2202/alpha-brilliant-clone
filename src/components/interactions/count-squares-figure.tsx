import { useEffect, useState } from "react";
import type { RefObject } from "react";

import type { TriangleSide } from "../../content/types";
import {
  type CanvasColor,
  type CanvasComponentHandle,
  type CanvasTarget,
} from "../../lib/ai/tools/canvas";
import { cn } from "../../lib/cn";
import { StateBadge } from "../ui";
import { RightTriangleFigure } from "../visuals";

export type CountSquaresState = "default" | "correct" | "incorrect";

/** Size presets for the embedded count input. `md` matches the full-size lesson
 *  figure; `sm` suits compact embedded figures. Text stays ≥16px so mobile
 *  Safari never zooms on focus. */
const INPUT_SIZE: Record<"md" | "sm", string> = {
  md: "h-12 w-16 rounded-xl text-2xl shadow-lg",
  sm: "h-8 w-11 rounded-lg text-base shadow-md",
};

export interface CountSquaresFigureProps {
  /** Leg lengths used to draw the figure. */
  a: number;
  b: number;
  /** Which square is being counted (highlighted gold, hosts the input). */
  countSide: TriangleSide;
  /** Current typed count (controlled). */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Graded styling for the input. */
  state?: CountSquaresState;
  disabled?: boolean;
  /**
   * Visual size of the embedded count input. `md` (default) is sized for the
   * full-size lesson figure; `sm` fits compact, embedded figures (e.g. the
   * marketing playground) where the squares are small and the default box reads
   * as oversized.
   */
  inputSize?: "md" | "sm";
  /** Submit on Enter (mirrors the footer Check). */
  onEnter?: () => void;
  /**
   * Koji's canvas handle sink (the `KojiReactions` pattern). When provided, the
   * component publishes its `CanvasComponentHandle` here so the host's
   * `LessonCanvas` can highlight / label / point at the squares on the sides.
   * Omit (or pass undefined) and the component is byte-for-byte its old self —
   * no handle, no annotations.
   */
  canvasRef?: RefObject<CanvasComponentHandle | null>;
  className?: string;
}

type Pt = { x: number; y: number };

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
 * The parts Koji can address on this figure: the three squares built on the
 * triangle's sides (the a² + b² = c² area proof). Roles are orientation-free —
 * `square-a` / `square-b` sit on the legs, `square-c` on the hypotenuse. Local
 * source of truth, returned verbatim from `listTargets()`.
 */
const COUNT_SQUARES_CANVAS_TARGETS: readonly CanvasTarget[] = [
  { id: "square-a", role: "square", label: "a²" },
  { id: "square-b", role: "square", label: "b²" },
  { id: "square-c", role: "square", label: "c²" },
];

/**
 * Count-the-unit-squares interaction: a large right-triangle figure with grids
 * on every side, and an input embedded *inside* the highlighted square so the
 * learner types the count right where they're counting.
 *
 * The input is overlaid as a normal HTML control (reliable focus/styling) and
 * positioned by recomputing the figure's geometry to find the counted square's
 * centre as a percentage of the SVG viewBox, so it tracks the responsive SVG.
 */
export function CountSquaresFigure({
  a,
  b,
  countSide,
  value,
  onChange,
  state = "default",
  disabled = false,
  inputSize = "md",
  onEnter,
  canvasRef,
  className,
}: CountSquaresFigureProps) {
  // Koji's annotations (highlight / label / point), keyed by target id. Additive
  // overlay only — never disturbs the counting grid, the input, or grading.
  const [annotations, setAnnotations] = useState<Record<string, CanvasAnnotation>>(
    {},
  );

  // Publish the canvas handle so Koji's tools can drive the figure. Visual ops
  // are pure setState (the geometry is read at render time from `annotations`),
  // so the handle is stable and only re-published if the sink ref changes. The
  // host clears annotations on step change and the cleanup nulls the ref on
  // unmount, so highlights never leak across steps.
  useEffect(() => {
    if (!canvasRef) return;
    const handle: CanvasComponentHandle = {
      listTargets: () =>
        COUNT_SQUARES_CANVAS_TARGETS.map((target) => ({ ...target })),
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

  // Mirror RightTriangleFigure's geometry to locate the counted square's centre.
  const A: Pt = { x: 0, y: 0 };
  const B: Pt = { x: a, y: 0 };
  const C: Pt = { x: 0, y: b };
  const squares: Record<TriangleSide, Pt[]> = {
    a: [A, B, { x: a, y: -a }, { x: 0, y: -a }],
    b: [A, { x: -b, y: 0 }, { x: -b, y: b }, C],
    c: [B, C, { x: b, y: b + a }, { x: a + b, y: a }],
  };
  const drawn = [...squares.a, ...squares.b, ...squares.c];
  const xs = drawn.map((p) => p.x);
  const ys = drawn.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const u = 200 / Math.max(maxX - minX, maxY - minY);
  const pad = 26;
  const W = (maxX - minX) * u + pad * 2;
  const H = (maxY - minY) * u + pad * 2;
  const sq = squares[countSide];
  const cx = sq.reduce((s, p) => s + p.x, 0) / sq.length;
  const cy = sq.reduce((s, p) => s + p.y, 0) / sq.length;
  const leftPct = (((cx - minX) * u + pad) / W) * 100;
  const topPct = (((maxY - cy) * u + pad) / H) * 100;

  // Koji canvas overlay helpers. Reuse the exact view-box mapping the figure
  // uses (same minX/maxY/u/pad), so a square's tint lands precisely on it no
  // matter how the responsive SVG is scaled. Only used when annotations exist.
  const map = (p: Pt): Pt => ({
    x: (p.x - minX) * u + pad,
    y: (maxY - p.y) * u + pad,
  });
  const polyOf = (pts: Pt[]) =>
    pts
      .map(map)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
  const centerOf = (pts: Pt[]): Pt =>
    map({
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    });
  const sw = Math.max(1.5, u * 0.014);
  const fontSize = Math.max(12, u * 0.16);
  const tagFont = Math.max(11, fontSize * 0.8);
  // A small rounded tag near a square, tinted to match its highlight.
  const tag = (tx: number, ty: number, text: string, colorVar: string) => {
    const w = text.length * tagFont * 0.62 + tagFont;
    const h = tagFont * 1.7;
    return (
      <g pointerEvents="none">
        <rect
          x={tx - w / 2}
          y={ty - h / 2}
          width={w}
          height={h}
          rx={h / 2}
          fill={`color-mix(in srgb, ${colorVar} 20%, var(--background))`}
          stroke={colorVar}
          strokeWidth={1}
        />
        <text
          x={tx}
          y={ty}
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
  const annotationEntries = Object.entries(annotations);

  // The figure's anchor for pushing labels OUTWARD (away from the triangle). The
  // squares sit on the OUTSIDE of each side, so a tag offset from here lands clear
  // of the triangle and its neighbours. (Triangle centroid, mapped to view space.)
  const figureCenter = map({ x: a / 3, y: b / 3 });
  // Place a square's tag just BEYOND its outer edge (not centered on its grid /
  // the embedded count input): push from the figure center, through the square's
  // center, past its furthest vertex in that direction, plus a small gap.
  const tagOutside = (pts: Pt[]): Pt => {
    const center = centerOf(pts);
    let ox = center.x - figureCenter.x;
    let oy = center.y - figureCenter.y;
    const len = Math.hypot(ox, oy) || 1;
    ox /= len;
    oy /= len;
    let reach = 0;
    for (const p of pts) {
      const m = map(p);
      const proj = (m.x - center.x) * ox + (m.y - center.y) * oy;
      if (proj > reach) reach = proj;
    }
    const off = reach + tagFont * 1.2;
    return { x: center.x + ox * off, y: center.y + oy * off };
  };

  return (
    <div className={cn("relative mx-auto w-full max-w-md", className)}>
      <RightTriangleFigure
        a={a}
        b={b}
        gridSquares
        highlightSquare={countSide}
        labels
        letterLabels
        className="w-full max-w-none"
      />
      {/* Koji's annotation overlay — additive, drawn on top of the figure but
          beneath the input, and never interactive (pointer-events: none), so the
          unit-cell grid stays countable and the input stays usable. Shares the
          figure's view-box so tints align exactly with each square. */}
      {annotationEntries.length > 0 ? (
        <svg
          viewBox={`0 0 ${W.toFixed(1)} ${H.toFixed(1)}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          {annotationEntries.map(([targetId, ann]) => {
            const side = targetId.replace("square-", "");
            const pts =
              side === "a" || side === "b" || side === "c" ? squares[side] : null;
            if (!pts) return null;
            const colorVar = CANVAS_COLOR_VAR[ann.color ?? "accent"];
            // A pure label() draws only the tag; highlight()/point() tint too.
            const showFill = ann.color !== undefined || ann.point === true;
            const pulse = ann.point ? "koji-canvas-pulse" : undefined;
            const labelAt = ann.label ? tagOutside(pts) : null;
            return (
              <g key={targetId}>
                {showFill ? (
                  <polygon
                    points={polyOf(pts)}
                    fill={`color-mix(in srgb, ${colorVar} 22%, var(--background))`}
                    fillOpacity={0.55}
                    stroke={colorVar}
                    strokeWidth={sw * 2}
                    strokeLinejoin="round"
                    className={pulse}
                    pointerEvents="none"
                  />
                ) : null}
                {ann.label && labelAt
                  ? tag(labelAt.x, labelAt.y, ann.label, colorVar)
                  : null}
              </g>
            );
          })}
        </svg>
      ) : null}
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      >
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={value ?? ""}
            disabled={disabled}
            placeholder="?"
            aria-label={`Number of unit squares in the square on side ${countSide}`}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "");
              onChange(digits === "" ? null : Number(digits));
            }}
            onKeyDown={(e) => {
              // Ignore auto-repeat (held Enter) so a single press grades only once.
              if (e.key === "Enter" && !e.repeat) {
                e.preventDefault();
                onEnter?.();
              }
            }}
            className={cn(
              "border-2 bg-background/85 text-center font-bold text-foreground outline-none transition-colors placeholder:text-muted",
              INPUT_SIZE[inputSize],
              state === "correct"
                ? "border-success"
                : state === "incorrect"
                  ? "border-warning"
                  : "border-border focus:border-accent",
            )}
          />
          {state !== "default" ? <StateBadge state={state} /> : null}
        </div>
      </div>
    </div>
  );
}
