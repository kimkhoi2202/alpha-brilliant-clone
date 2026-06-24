import { cn } from "../../lib/cn";

export interface RightTriangleFigureProps {
  /** Horizontal leg length. */
  a: number;
  /** Vertical leg length. */
  b: number;
  /** Draw the squares on each side (the a² + b² = c² picture). */
  showSquares?: boolean;
  /**
   * Draw each side-square as a grid of unit cells (implies `showSquares`) and
   * hide the center area numbers, so the learner counts the area themselves.
   * Intended for integer-sided triangles (e.g. the 3-4-5 triple).
   */
  gridSquares?: boolean;
  /**
   * Tint one square gold (the "in question" highlight) while the others stay
   * accent-blue. Defaults to the hypotenuse square being gold.
   */
  highlightSquare?: "a" | "b" | "c";
  /** Label the legs with their lengths and the hypotenuse as c. */
  labels?: boolean;
  /** Hide the hypotenuse square's area, showing a gold "?", for when that area
   *  is the value the learner has to find (don't give the answer away). */
  unknownHypotenuse?: boolean;
  /** Mark one side's *length* label as the unknown (a gold "?"): "find this side". */
  unknownSide?: "a" | "b" | "c";
  /** Label the hypotenuse with its computed length √(a²+b²) instead of "c". */
  showHypotenuseValue?: boolean;
  /** Label the legs a / b (and the hypotenuse c) instead of their numeric
   *  lengths, for "which side is which?" identification questions. */
  letterLabels?: boolean;
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
  gridSquares = false,
  highlightSquare,
  labels = false,
  unknownHypotenuse = false,
  unknownSide,
  showHypotenuseValue = false,
  letterLabels = false,
  className,
}: RightTriangleFigureProps) {
  // gridSquares draws the squares too (with unit cells).
  const drawSquares = showSquares || gridSquares;
  const A: Pt = { x: 0, y: 0 };
  const B: Pt = { x: a, y: 0 };
  const C: Pt = { x: 0, y: b };

  // Squares (math space). The hypotenuse square's outward offset is (b, a).
  const squareAB: Pt[] = [A, B, { x: a, y: -a }, { x: 0, y: -a }];
  const squareAC: Pt[] = [A, { x: -b, y: 0 }, { x: -b, y: b }, C];
  const squareBC: Pt[] = [B, C, { x: b, y: b + a }, { x: a + b, y: a }];

  const drawn: Pt[] = drawSquares
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
  const lerp = (p: Pt, q: Pt, t: number): Pt => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
  });
  // Inner grid lines for a square given its 4 corners (in order) and the number
  // of unit cells per side, works for the tilted hypotenuse square too.
  const gridLines = (corners: Pt[], n: number): [Pt, Pt][] => {
    const [P0, P1, P2, P3] = corners;
    if (!Number.isFinite(n) || n < 2) return [];
    const segs: [Pt, Pt][] = [];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      segs.push([lerp(P0, P3, t), lerp(P1, P2, t)]);
      segs.push([lerp(P0, P1, t), lerp(P3, P2, t)]);
    }
    return segs;
  };

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

  // Side-length labels. Any side can be the unknown ("?", gold); the hypotenuse
  // can show its computed length (nice integers for Pythagorean triples).
  const hyp = Math.hypot(a, b);
  const hypText = Number.isInteger(hyp) ? String(hyp) : hyp.toFixed(2);
  const aLabel = letterLabels ? "a" : unknownSide === "a" ? "?" : String(a);
  const bLabel = letterLabels ? "b" : unknownSide === "b" ? "?" : String(b);
  const cLabel = letterLabels
    ? "c"
    : unknownSide === "c"
      ? "?"
      : showHypotenuseValue
        ? hypText
        : "c";
  const accentInk = "var(--foreground)";
  // Which side's square is the gold ("in question") one: mirrors the square fill.
  const squareGold = (id: "a" | "b" | "c") =>
    highlightSquare ? id === highlightSquare : id === "c";
  // When the squares are drawn, colour each side label to match its square;
  // otherwise keep the plain scheme (white legs, gold hypotenuse / unknown side).
  const labelFill = (id: "a" | "b" | "c"): string => {
    if (drawSquares) return squareGold(id) ? "var(--warning)" : "var(--accent)";
    if (id === "c") return "var(--warning)";
    return unknownSide === id ? "var(--warning)" : accentInk;
  };
  const aFill = labelFill("a");
  const bFill = labelFill("b");
  const cFill = labelFill("c");

  return (
    <svg
      viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`}
      className={cn("mx-auto h-auto w-full max-w-[17rem]", className)}
      role="img"
      aria-label={`Right triangle with legs ${a} and ${b}${
        drawSquares ? ", showing squares on each side" : ""
      }`}
    >
      {drawSquares ? (
        <g>
          {[
            { id: "a" as const, pts: squareAB, n: Math.round(a) },
            { id: "b" as const, pts: squareAC, n: Math.round(b) },
            { id: "c" as const, pts: squareBC, n: Math.round(Math.hypot(a, b)) },
          ].map((sq, i) => {
            // The "in question" square is gold; others are accent-blue. With no
            // explicit highlight, the hypotenuse square is the gold one.
            const gold = highlightSquare ? sq.id === highlightSquare : sq.id === "c";
            const line = gold ? "var(--warning)" : "var(--accent)";
            const soft = gold ? "var(--warning-soft)" : "var(--accent-soft)";
            return (
              <g key={i}>
                <polygon
                  points={poly(sq.pts)}
                  style={{ fill: soft, stroke: line }}
                  strokeWidth={sw}
                  strokeLinejoin="round"
                />
                {gridSquares
                  ? gridLines(sq.pts, sq.n).map((seg, j) => {
                      const p1 = map(seg[0]);
                      const p2 = map(seg[1]);
                      return (
                        <line
                          key={j}
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          style={{ stroke: line }}
                          strokeWidth={sw * 0.6}
                          strokeOpacity={0.5}
                        />
                      );
                    })
                  : null}
              </g>
            );
          })}
          {!gridSquares
            ? [
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
              })
            : null}
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
        <g fontSize={fontSize} fontWeight={700}>
          <text
            x={abMid.x}
            y={abMid.y + fontSize * 1.1}
            textAnchor="middle"
            style={{ fill: aFill }}
          >
            {aLabel}
          </text>
          <text
            x={acMid.x - fontSize * 0.7}
            y={acMid.y}
            textAnchor="end"
            dominantBaseline="central"
            style={{ fill: bFill }}
          >
            {bLabel}
          </text>
          <text
            x={bcMid.x + fontSize * 0.5}
            y={bcMid.y - fontSize * 0.5}
            textAnchor="start"
            style={{ fill: cFill }}
          >
            {cLabel}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
