import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { GridPoint } from "../../content/types";
import type {
  CanvasColor,
  CanvasComponentHandle,
  CanvasTarget,
} from "../../lib/ai/tools/canvas";
import { CoordinateGrid } from "../visuals/coordinate-grid";

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

/** Where a target lives on the grid, in the same user units CoordinateGrid uses. */
type TargetGeom =
  | { kind: "axis"; axis: "x" | "y" }
  | { kind: "point"; x: number; y: number };

/** A CanvasTarget plus the geometry Koji's overlay needs to draw it. */
type GridTarget = CanvasTarget & { geom: TargetGeom };

export interface PlotPointsGridProps {
  size: number;
  markers?: GridPoint[];
  placed: GridPoint[];
  targetCount: number;
  /**
   * The goal location(s) the learner is plotting toward (the interaction's
   * `targets`). Host-owned and optional: when provided, Koji can address the
   * goal as `target` (one) or `target-1..n` (many); omit it and no target id
   * appears in `listTargets()`. Passing it never reveals the answer on its own —
   * it only renders when Koji draws on it, and the component is inert with AI off.
   */
  targets?: GridPoint[];
  onPlace: (point: GridPoint) => void;
  onClear: () => void;
  disabled?: boolean;
  /**
   * Koji's canvas handle sink (the `KojiReactions` pattern). When provided, the
   * component publishes its `CanvasComponentHandle` here so the host's
   * `LessonCanvas` can highlight / label / point at the axes, origin, given
   * points, and goal. Omit (or pass undefined) and the component is byte-for-byte
   * its old self — no handle, no annotations.
   */
  canvasRef?: RefObject<CanvasComponentHandle | null>;
}

/** Tap-to-place interaction built on the coordinate grid. */
export function PlotPointsGrid({
  size,
  markers,
  placed,
  targetCount,
  targets,
  onPlace,
  onClear,
  disabled,
  canvasRef,
}: PlotPointsGridProps) {
  const remaining = targetCount - placed.length;

  // Koji's annotations (highlight / label / point), keyed by target id. Additive
  // overlay only — never touches the grid's markers, placed dots, or hit areas.
  const [annotations, setAnnotations] = useState<Record<string, CanvasAnnotation>>(
    {},
  );

  // The addressable parts of the figure, derived from the grid's data. The axes
  // and origin are stable geometric anchors that always exist; given markers and
  // the goal location(s) are exposed only when present. Ids are stable within a
  // step (markers/targets are fixed per step), so Koji can reference them safely.
  const givenPoints = markers ?? [];
  const goalPoints = targets ?? [];
  const gridTargets: GridTarget[] = [
    { id: "axis-x", role: "axis", label: "x-axis", geom: { kind: "axis", axis: "x" } },
    { id: "axis-y", role: "axis", label: "y-axis", geom: { kind: "axis", axis: "y" } },
    { id: "origin", role: "origin", label: "origin", geom: { kind: "point", x: 0, y: 0 } },
    ...givenPoints.map((m, i) => ({
      id: `point-${i + 1}`,
      role: "point",
      label: `(${m.x}, ${m.y})`,
      geom: { kind: "point" as const, x: m.x, y: m.y },
    })),
    ...goalPoints.map((t, i) => ({
      id: goalPoints.length === 1 ? "target" : `target-${i + 1}`,
      role: "target-point",
      label: "goal",
      geom: { kind: "point" as const, x: t.x, y: t.y },
    })),
  ];

  // The published handle stays stable (re-published only if the sink ref changes),
  // but `listTargets()` must reflect the current data — so read the live list
  // through a ref instead of capturing a stale snapshot in the effect closure.
  // The ref is synced after each commit (never written during render); the handle
  // is only ever called asynchronously by Koji's tools, well after that.
  const targetsRef = useRef(gridTargets);
  useEffect(() => {
    targetsRef.current = gridTargets;
  });

  // Publish the canvas handle so Koji's tools can drive the figure. Visual ops
  // are pure setState (the geometry is read at render time from `annotations`),
  // so the handle is stable and only re-published if the sink ref changes. The
  // cleanup nulls the ref on unmount, so highlights never leak across steps.
  useEffect(() => {
    if (!canvasRef) return;
    const handle: CanvasComponentHandle = {
      listTargets: () =>
        targetsRef.current.map(({ id, role, label }) => ({ id, role, label })),
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

  // Geometry — must mirror CoordinateGrid exactly so the overlay aligns over it.
  const u = 38;
  const pad = 26;
  const span = size * u;
  const width = span + pad * 2;
  const height = span + pad * 2;
  const sx = (x: number) => pad + x * u;
  const sy = (y: number) => pad + (size - y) * u;

  const annotationEntries = Object.entries(annotations);
  const tagFont = 12;
  const geomById = (id: string): TargetGeom | null =>
    gridTargets.find((t) => t.id === id)?.geom ?? null;

  // A small rounded tag near a part, tinted to match its highlight (mirrors
  // PickSideTriangle.tag: soft color-mix fill + token-colored text/border).
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

  return (
    <div className="flex flex-col items-center gap-3">
      {/* The grid wrapper is a flex box so it hugs CoordinateGrid's height exactly
          (no inline-svg baseline gap), letting the absolute overlay align to it.
          When un-annotated this adds no visible change — the overlay isn't drawn. */}
      <div className="relative flex w-full max-w-[20rem] items-start">
        <CoordinateGrid
          size={size}
          markers={markers}
          placed={placed}
          onPlace={disabled ? undefined : onPlace}
          onRemove={disabled ? undefined : () => onClear()}
        />

        {/* Koji's annotation overlay — additive, drawn on top, never interactive
            (pointer-events none), so taps still land on the grid's hit areas. Only
            mounted once Koji has drawn something, so the un-annotated / AI-off
            render stays byte-identical. Shares CoordinateGrid's viewBox so user
            coordinates line up pixel-for-pixel. */}
        {annotationEntries.length > 0 ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
          >
            {annotationEntries.map(([targetId, ann]) => {
              const geom = geomById(targetId);
              if (!geom) return null;
              const colorVar = CANVAS_COLOR_VAR[ann.color ?? "accent"];
              const showStroke = ann.color !== undefined || ann.point === true;
              const pulse = ann.point ? "koji-canvas-pulse" : undefined;

              if (geom.kind === "axis") {
                const isX = geom.axis === "x";
                const x1 = sx(0);
                const y1 = sy(0);
                const x2 = isX ? sx(size) : sx(0);
                const y2 = isX ? sy(0) : sy(size);
                // Tag the axis near its far end, clear of the tick numbers.
                const lx = isX ? sx(size) - u : sx(0) + tagFont * 1.8;
                const ly = isX ? sy(0) - tagFont * 1.6 : pad + tagFont;
                return (
                  <g key={targetId}>
                    {showStroke ? (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={colorVar}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeOpacity={0.9}
                        className={pulse}
                        pointerEvents="none"
                      />
                    ) : null}
                    {ann.label ? tag(lx, ly, ann.label, colorVar) : null}
                  </g>
                );
              }

              // A point target (origin / point-N / target): ring it (plus a soft
              // halo) so it reads above the existing accent/success dots without
              // covering them, then tag just above.
              const cx = sx(geom.x);
              const cy = sy(geom.y);
              return (
                <g key={targetId}>
                  {showStroke ? (
                    <g className={pulse}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11}
                        fill="none"
                        stroke={colorVar}
                        strokeWidth={8}
                        strokeOpacity={0.2}
                        pointerEvents="none"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={11}
                        fill="none"
                        stroke={colorVar}
                        strokeWidth={2.5}
                        pointerEvents="none"
                      />
                    </g>
                  ) : null}
                  {ann.label ? tag(cx, cy - tagFont * 2, ann.label, colorVar) : null}
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>

      {!disabled && (
        <p className="text-sm text-muted" aria-live="polite">
          {placed.length === 0
            ? `Tap the grid to place ${targetCount} point${targetCount > 1 ? "s" : ""}.`
            : remaining > 0
              ? `${remaining} more to place.`
              : "Ready, tap Check or tap the point to redo."}
        </p>
      )}
    </div>
  );
}
