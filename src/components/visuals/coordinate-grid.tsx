import { useEffect, useId, useState } from "react";

import type { GridPoint } from "../../content/types";
import { cn } from "../../lib/cn";

export interface CoordinateGridProps {
  /** Grid extent: cells run 0..size on both axes. */
  size: number;
  /** Fixed reference points (filled accent dots). */
  markers?: GridPoint[];
  /** Learner-placed points (success-green dots). */
  placed?: GridPoint[];
  /** Draw the right-triangle legs + hypotenuse between the first two markers. */
  showDistance?: boolean;
  /** When set, the grid is interactive: tap a lattice point to place it. */
  onPlace?: (point: GridPoint) => void;
  /** When set, tapping an already-placed point removes it (toggle off). */
  onRemove?: (point: GridPoint) => void;
  className?: string;
}

/** SSR-safe `prefers-reduced-motion` subscription. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false),
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/**
 * The locked-in guide line: a solid yellow stroke that draws itself from the
 * origin to the placed point (classic `stroke-dashoffset` reveal). Keyed by the
 * point upstream, so re-placing remounts it and the draw replays. Under reduced
 * motion it renders complete immediately.
 */
function GuideDrawLine({
  x1,
  y1,
  x2,
  y2,
  reduced,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  reduced: boolean;
}) {
  const length = Math.hypot(x2 - x1, y2 - y1) || 0.0001;
  // Keyed by the placed point upstream, so this mounts fresh on every placement:
  // start hidden (offset = length) unless reduced motion wants it complete now.
  const [drawn, setDrawn] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    let raf2 = 0;
    // Paint the fully-offset (invisible) line for one frame, then flip to 0 so
    // the transition has something to animate from. setState only fires inside
    // rAF, never synchronously in the effect body.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setDrawn(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [reduced]);

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={3}
      strokeLinecap="round"
      style={{
        stroke: "var(--warning)",
        strokeDasharray: length,
        strokeDashoffset: drawn ? 0 : length,
        transition: reduced
          ? "none"
          : "stroke-dashoffset 500ms cubic-bezier(0.215, 0.61, 0.355, 1)",
        pointerEvents: "none",
      }}
    />
  );
}

/**
 * Coordinate grid. Presentational by default; pass `onPlace` to make every
 * lattice intersection tappable (the plot-points interaction). Uses pointer
 * events via native click, so it works on touch.
 *
 * In interactive mode a yellow guide line connects the origin to the point:
 * a faint dashed preview tracks the cursor on hover, and on placement a solid
 * line draws itself in. `onRemove` makes the placed dot tappable to clear it.
 */
export function CoordinateGrid({
  size,
  markers = [],
  placed = [],
  showDistance = false,
  onPlace,
  onRemove,
  className,
}: CoordinateGridProps) {
  const u = 38;
  const pad = 26;
  const span = size * u;
  const width = span + pad * 2;
  const height = span + pad * 2;

  const sx = (x: number) => pad + x * u;
  const sy = (y: number) => pad + (size - y) * u;

  const lines = Array.from({ length: size + 1 }, (_, i) => i);
  const distancePair = showDistance && markers.length >= 2;

  const reduced = usePrefersReducedMotion();
  const gradientId = `grid-guide-${useId().replace(/:/g, "")}`;
  const [hovering, setHovering] = useState(false);
  const [hoverPoint, setHoverPoint] = useState<GridPoint>({ x: 0, y: 0 });

  const lastPlaced = placed.length > 0 ? placed[placed.length - 1] : null;

  // The dashed preview is only meaningful when it has length and isn't just
  // retracing the dot the learner already locked in.
  const showHoverGuide =
    Boolean(onPlace) &&
    hovering &&
    !(hoverPoint.x === 0 && hoverPoint.y === 0) &&
    !(lastPlaced && lastPlaced.x === hoverPoint.x && lastPlaced.y === hoverPoint.y);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("mx-auto h-auto w-full max-w-[20rem] touch-manipulation", className)}
      role="img"
      aria-label={`Coordinate grid, ${size} by ${size}`}
      onPointerMove={(e) => {
        // Desktop pointer only: touch has no hover, and we don't want a tap to
        // leave a sticky preview behind.
        if (!onPlace || e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const vx = ((e.clientX - rect.left) / rect.width) * width;
        const vy = ((e.clientY - rect.top) / rect.height) * height;
        const gx = Math.min(size, Math.max(0, Math.round((vx - pad) / u)));
        const gy = Math.min(size, Math.max(0, Math.round(size - (vy - pad) / u)));
        setHoverPoint((prev) => (prev.x === gx && prev.y === gy ? prev : { x: gx, y: gy }));
        setHovering(true);
      }}
      onPointerLeave={() => setHovering(false)}
    >
      {/* grid lines */}
      <g style={{ stroke: "var(--border)" }} strokeWidth={1}>
        {lines.map((i) => (
          <line key={`h${i}`} x1={pad} y1={sy(i)} x2={pad + span} y2={sy(i)} />
        ))}
        {lines.map((i) => (
          <line key={`v${i}`} x1={sx(i)} y1={pad} x2={sx(i)} y2={pad + span} />
        ))}
      </g>

      {/* axes */}
      <g style={{ stroke: "var(--muted)" }} strokeWidth={2}>
        <line x1={pad} y1={sy(0)} x2={pad + span} y2={sy(0)} />
        <line x1={sx(0)} y1={pad} x2={sx(0)} y2={pad + span} />
      </g>

      {/* axis ticks */}
      <g style={{ fill: "var(--muted)" }} fontSize={11}>
        {lines.map((i) => (
          <text key={`tx${i}`} x={sx(i)} y={sy(0) + 16} textAnchor="middle">
            {i}
          </text>
        ))}
        {lines
          .filter((i) => i > 0)
          .map((i) => (
            <text
              key={`ty${i}`}
              x={sx(0) - 10}
              y={sy(i)}
              textAnchor="end"
              dominantBaseline="central"
            >
              {i}
            </text>
          ))}
      </g>

      {/* distance triangle between the first two markers */}
      {distancePair ? (
        <g>
          <line
            x1={sx(markers[0].x)}
            y1={sy(markers[0].y)}
            x2={sx(markers[1].x)}
            y2={sy(markers[0].y)}
            style={{ stroke: "var(--accent)" }}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <line
            x1={sx(markers[1].x)}
            y1={sy(markers[0].y)}
            x2={sx(markers[1].x)}
            y2={sy(markers[1].y)}
            style={{ stroke: "var(--accent)" }}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
          <line
            x1={sx(markers[0].x)}
            y1={sy(markers[0].y)}
            x2={sx(markers[1].x)}
            y2={sy(markers[1].y)}
            style={{ stroke: "var(--warning)" }}
            strokeWidth={3}
          />
        </g>
      ) : null}

      {/* interactive lattice hit targets: on hover, preview a faint green dot
          (a ghost of the point you'd lock in on click). */}
      {onPlace
        ? lines.flatMap((x) =>
            lines.map((y) => (
              <g key={`hit-${x}-${y}`} className="group cursor-pointer">
                <circle
                  cx={sx(x)}
                  cy={sy(y)}
                  r={6}
                  className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-40"
                  style={{ fill: "var(--success)" }}
                />
                <circle
                  cx={sx(x)}
                  cy={sy(y)}
                  r={u * 0.42}
                  className="fill-transparent"
                  onClick={() => onPlace({ x, y })}
                  role="button"
                  aria-label={`Place point at ${x}, ${y}`}
                />
              </g>
            )),
          )
        : null}

      {/* yellow guide line: rendered beneath the dots and never intercepting
          taps (pointer-events: none). The dashed gradient previews on hover and
          only exists while the grid is interactive; the solid line is the
          locked-in connection from the origin to the point and PERSISTS as long
          as a point is placed — including after grading (correct or incorrect),
          when the grid is no longer interactive. Keyed by the point, so it stays
          mounted (no re-draw) across the answering -> graded transition. */}
      {onPlace || lastPlaced ? (
        <g style={{ pointerEvents: "none" }}>
          {onPlace ? (
            <defs>
              <linearGradient
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1={sx(0)}
                y1={sy(0)}
                x2={sx(hoverPoint.x)}
                y2={sy(hoverPoint.y)}
              >
                <stop offset="0" stopColor="var(--warning)" stopOpacity={0.85} />
                <stop offset="1" stopColor="var(--warning)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
          ) : null}

          {lastPlaced ? (
            <GuideDrawLine
              key={`draw-${lastPlaced.x}-${lastPlaced.y}`}
              x1={sx(0)}
              y1={sy(0)}
              x2={sx(lastPlaced.x)}
              y2={sy(lastPlaced.y)}
              reduced={reduced}
            />
          ) : null}

          {onPlace ? (
            <line
              x1={sx(0)}
              y1={sy(0)}
              x2={sx(hoverPoint.x)}
              y2={sy(hoverPoint.y)}
              stroke={`url(#${gradientId})`}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="5 6"
              style={{
                opacity: showHoverGuide ? 1 : 0,
                transition: reduced ? "none" : "opacity 160ms ease",
              }}
            />
          ) : null}
        </g>
      ) : null}

      {/* markers */}
      {markers.map((p, i) => (
        <circle
          key={`m${i}`}
          cx={sx(p.x)}
          cy={sy(p.y)}
          r={5}
          style={{ fill: "var(--accent)" }}
        />
      ))}

      {/* learner-placed points: tappable to remove when `onRemove` is set. The
          larger transparent hit circle sits on top so the tap toggles the point
          off (and wins over the placement target beneath it). */}
      {placed.map((p, i) => (
        <g key={`p${i}`}>
          <circle
            cx={sx(p.x)}
            cy={sy(p.y)}
            r={6}
            className="pointer-events-none"
            style={{ fill: "var(--success)", stroke: "var(--background)" }}
            strokeWidth={2}
          />
          {onRemove ? (
            <circle
              cx={sx(p.x)}
              cy={sy(p.y)}
              r={u * 0.42}
              className="fill-transparent cursor-pointer"
              onClick={() => onRemove(p)}
              role="button"
              aria-label={`Remove point at ${p.x}, ${p.y}`}
            />
          ) : null}
        </g>
      ))}
    </svg>
  );
}
