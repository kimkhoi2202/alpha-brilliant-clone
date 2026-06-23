import { cn } from "../../lib/cn";

export interface RightTriangleFigureProps {
  /** Horizontal leg length. */
  a: number;
  /** Vertical leg length. */
  b: number;
  /** Draw the squares on each side (the a² + b² = c² picture). */
  showSquares?: boolean;
  /** Label the legs with their lengths and the hypotenuse as c. */
  labels?: boolean;
  /** Hide the hypotenuse square's area, showing a gold "?" — for when that area
   *  is the value the learner has to find (don't give the answer away). */
  unknownHypotenuse?: boolean;
  className?: string;
}

type Pt = { x: number; y: number };

/**
 * Crisp, responsive right-triangle figure (right angle at the origin). With
 * `showSquares` it draws the classic squares-on-the-sides picture, the two leg
 * squares tinted with the brand accent and the hypotenuse square in gold to
 * show a² + b² = c².
 */
export function RightTriangleFigure({
  a,
  b,
  showSquares = false,
  labels = false,
  unknownHypotenuse = false,
  className,
}: RightTriangleFigureProps) {
  const A: Pt = { x: 0, y: 0 };
  const B: Pt = { x: a, y: 0 };
  const C: Pt = { x: 0, y: b };

  // Squares (math space). The hypotenuse square's outward offset is (b, a).
  const squareAB: Pt[] = [A, B, { x: a, y: -a }, { x: 0, y: -a }];
  const squareAC: Pt[] = [A, { x: -b, y: 0 }, { x: -b, y: b }, C];
  const squareBC: Pt[] = [B, C, { x: b, y: b + a }, { x: a + b, y: a }];

  const drawn: Pt[] = showSquares
    ? [...squareAB, ...squareAC, ...squareBC]
    : [A, B, C];
  const xs = drawn.map((p) => p.x);
  const ys = drawn.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const u = 200 / Math.max(maxX - minX, maxY - minY);
  const pad = 26;
  const width = (maxX - minX) * u + pad * 2;
  const height = (maxY - minY) * u + pad * 2;

  const map = (p: Pt): Pt => ({
    x: (p.x - minX) * u + pad,
    y: (maxY - p.y) * u + pad,
  });
  const poly = (pts: Pt[]) =>
    pts
      .map(map)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
  const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const centroid = (pts: Pt[]): Pt => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  });

  const sw = Math.max(1.5, u * 0.014);
  const fontSize = Math.max(12, u * 0.16);

  // Right-angle marker at A (a small square inside the triangle corner).
  const m = Math.min(a, b) * 0.16 + 0.0001;
  const rightAngle: Pt[] = [
    { x: m, y: 0 },
    { x: m, y: m },
    { x: 0, y: m },
  ];

  const abMid = map(mid(A, B));
  const acMid = map(mid(A, C));
  const bcMid = map(mid(B, C));

  return (
    <svg
      viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`}
      className={cn("mx-auto h-auto w-full max-w-[18rem]", className)}
      role="img"
      aria-label={`Right triangle with legs ${a} and ${b}${
        showSquares ? ", showing squares on each side" : ""
      }`}
    >
      {showSquares ? (
        <g>
          <polygon
            points={poly(squareAB)}
            style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <polygon
            points={poly(squareAC)}
            style={{ fill: "var(--accent-soft)", stroke: "var(--accent)" }}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <polygon
            points={poly(squareBC)}
            style={{ fill: "var(--warning-soft)", stroke: "var(--warning)" }}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          {[
            { pts: squareAB, label: a * a, gold: false },
            { pts: squareAC, label: b * b, gold: false },
            {
              pts: squareBC,
              label: unknownHypotenuse ? "?" : a * a + b * b,
              gold: unknownHypotenuse,
            },
          ].map(({ pts, label, gold }, i) => {
            const c = map(centroid(pts));
            return (
              <text
                key={i}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fill: gold ? "var(--warning)" : "var(--foreground)" }}
                fontSize={fontSize}
                fontWeight={700}
              >
                {label}
              </text>
            );
          })}
        </g>
      ) : null}

      <polygon
        points={poly([A, B, C])}
        style={{ fill: "var(--surface)", stroke: "var(--foreground)" }}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <polyline
        points={poly(rightAngle)}
        fill="none"
        style={{ stroke: "var(--muted)" }}
        strokeWidth={sw * 0.8}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {labels ? (
        <g
          style={{ fill: "var(--foreground)" }}
          fontSize={fontSize}
          fontWeight={600}
        >
          <text x={abMid.x} y={abMid.y + fontSize * 1.1} textAnchor="middle">
            {a}
          </text>
          <text
            x={acMid.x - fontSize * 0.7}
            y={acMid.y}
            textAnchor="end"
            dominantBaseline="central"
          >
            {b}
          </text>
          <text
            x={bcMid.x + fontSize * 0.5}
            y={bcMid.y - fontSize * 0.5}
            textAnchor="start"
            style={{ fill: "var(--warning)" }}
          >
            c
          </text>
        </g>
      ) : null}
    </svg>
  );
}
