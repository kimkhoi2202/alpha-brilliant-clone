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
  className?: string;
}

/**
 * Coordinate grid. Presentational by default; pass `onPlace` to make every
 * lattice intersection tappable (the plot-points interaction). Uses pointer
 * events via native click, so it works on touch.
 */
export function CoordinateGrid({
  size,
  markers = [],
  placed = [],
  showDistance = false,
  onPlace,
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

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("mx-auto h-auto w-full max-w-[20rem] touch-manipulation", className)}
      role="img"
      aria-label={`Coordinate grid, ${size} by ${size}`}
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

      {/* interactive lattice hit targets */}
      {onPlace
        ? lines.flatMap((x) =>
            lines.map((y) => (
              <circle
                key={`hit-${x}-${y}`}
                cx={sx(x)}
                cy={sy(y)}
                r={u * 0.42}
                className="cursor-pointer fill-transparent transition-colors hover:fill-[var(--accent-soft)]"
                onClick={() => onPlace({ x, y })}
                role="button"
                aria-label={`Place point at ${x}, ${y}`}
              />
            )),
          )
        : null}

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

      {/* learner-placed points */}
      {placed.map((p, i) => (
        <circle
          key={`p${i}`}
          cx={sx(p.x)}
          cy={sy(p.y)}
          r={6}
          style={{ fill: "var(--success)", stroke: "var(--background)" }}
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}
