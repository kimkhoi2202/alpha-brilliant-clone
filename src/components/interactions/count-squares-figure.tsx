import type { TriangleSide } from "../../content/types";
import { cn } from "../../lib/cn";
import { StateBadge } from "../ui";
import { RightTriangleFigure } from "../visuals";

export type CountSquaresState = "default" | "correct" | "incorrect";

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
  /** Submit on Enter (mirrors the footer Check). */
  onEnter?: () => void;
  className?: string;
}

type Pt = { x: number; y: number };

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
  onEnter,
  className,
}: CountSquaresFigureProps) {
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
              "h-12 w-16 rounded-xl border-2 bg-background/85 text-center text-2xl font-bold text-foreground shadow-lg outline-none transition-colors placeholder:text-muted",
              state === "correct"
                ? "border-success"
                : state === "incorrect"
                  ? "border-warning"
                  : "border-border focus:border-foreground",
            )}
          />
          {state !== "default" ? <StateBadge state={state} /> : null}
        </div>
      </div>
    </div>
  );
}
