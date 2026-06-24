import { useEffect, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import { Button } from "../ui";

export interface RearrangementProofProps {
  /** Horizontal leg length. */
  a: number;
  /** Vertical leg length. */
  b: number;
  className?: string;
}

type Pt = { x: number; y: number };

/** Filled play triangle: press to play the rearrange (morph) animation. */
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 6.5 18 12l-9 5.5z" />
    </svg>
  );
}

/** Curved back-arrow (undo): press to revert to the original arrangement. */
function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H10" />
    </svg>
  );
}

/**
 * Interactive rearrangement proof of a² + b² = c².
 *
 * An (a+b) x (a+b) square holds four copies of the right triangle. A toggle
 * slides the same four triangles between two arrangements: a pinwheel that
 * leaves a tilted c² square in the middle, and two rectangles that leave an a²
 * and a b² square. The big square and the four triangles never change, so the
 * leftover (gold) area is conserved: that *is* the proof that c² = a² + b².
 *
 * The four triangles are matched between arrangements by their rotation, so the
 * morph is four pure translations (clean and reversible). `prefers-reduced-
 * motion` snaps instantly instead of animating.
 */
export function RearrangementProof({ a, b, className }: RearrangementProofProps) {
  const s = a + b;
  const [t, setT] = useState(0);
  // Target state for the label/caption: flips on press (not mid-animation),
  // and avoids reading the animation ref during render.
  const [rearranged, setRearranged] = useState(false);
  const tRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const setBoth = (v: number) => {
    tRef.current = v;
    setT(v);
  };

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const toggle = () => {
    const next = !rearranged;
    setRearranged(next);
    const target = next ? 1 : 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setBoth(target);
      return;
    }
    const start = tRef.current;
    const startTime = performance.now();
    const dur = 750;
    const ease = (k: number) =>
      k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const tick = (now: number) => {
      const k = Math.min(1, (now - startTime) / dur);
      setBoth(start + (target - start) * ease(k));
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  // Geometry (math space, y-up). The right angle of the base triangle is at the
  // origin, leg a along +x and leg b along +y.
  const rot = (v: Pt, deg: number): Pt => {
    const r = (deg * Math.PI) / 180;
    const c = Math.cos(r);
    const sn = Math.sin(r);
    return { x: v.x * c - v.y * sn, y: v.x * sn + v.y * c };
  };
  const base: Pt[] = [
    { x: 0, y: 0 },
    { x: a, y: 0 },
    { x: 0, y: b },
  ];
  const place = (pivot: Pt, deg: number): Pt[] =>
    base.map((v) => {
      const r = rot(v, deg);
      return { x: r.x + pivot.x, y: r.y + pivot.y };
    });
  const lerpPt = (p: Pt, q: Pt, k: number): Pt => ({
    x: p.x + (q.x - p.x) * k,
    y: p.y + (q.y - p.y) * k,
  });

  // Each triangle keeps its rotation between arrangements, so it only slides.
  // from = pinwheel (leftover c²); to = two rectangles (leftover a² + b²).
  const tris: { deg: number; from: Pt; to: Pt }[] = [
    { deg: 0, from: { x: 0, y: 0 }, to: { x: b, y: 0 } },
    { deg: 90, from: { x: s, y: 0 }, to: { x: b, y: b } },
    { deg: 180, from: { x: s, y: s }, to: { x: s, y: b } },
    { deg: 270, from: { x: 0, y: s }, to: { x: 0, y: s } },
  ];

  const u = 220 / s;
  const pad = 16;
  const W = s * u + pad * 2;
  const H = s * u + pad * 2;
  const map = (p: Pt): Pt => ({ x: p.x * u + pad, y: (s - p.y) * u + pad });
  const polyStr = (pts: Pt[]) =>
    pts
      .map(map)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
  const sw = Math.max(1.5, u * 0.018);
  const fontSize = Math.max(13, u * 0.6);

  const bigSquare: Pt[] = [
    { x: 0, y: 0 },
    { x: s, y: 0 },
    { x: s, y: s },
    { x: 0, y: s },
  ];

  // Leftover-area label anchors and their crossfade (c² <-> a² + b²).
  const cCenter = map({ x: s / 2, y: s / 2 });
  const aCenter = map({ x: b + a / 2, y: b + a / 2 });
  const bCenter = map({ x: b / 2, y: b / 2 });
  const cLabelOp = t < 0.5 ? 1 - t * 2 : 0;
  const abLabelOp = t > 0.5 ? (t - 0.5) * 2 : 0;

  const atStart = !rearranged;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg
        viewBox={`0 0 ${W.toFixed(1)} ${H.toFixed(1)}`}
        className="h-auto w-full max-w-[17rem]"
        role="img"
        aria-label="Four right triangles inside a square, rearranged to show the leftover area is the same whether it is one c-square or two leg-squares"
      >
        {/* The conserved leftover area shows through wherever the triangles
            aren't: gold, like the hypotenuse square. */}
        <polygon
          points={polyStr(bigSquare)}
          style={{ fill: "var(--warning-soft)", stroke: "var(--foreground)" }}
          strokeWidth={sw}
          strokeLinejoin="round"
        />

        <g fontWeight={700} style={{ fill: "var(--warning)" }} fontSize={fontSize}>
          <text
            x={cCenter.x}
            y={cCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            opacity={cLabelOp}
          >
            c²
          </text>
          <text
            x={aCenter.x}
            y={aCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            opacity={abLabelOp}
          >
            a²
          </text>
          <text
            x={bCenter.x}
            y={bCenter.y}
            textAnchor="middle"
            dominantBaseline="central"
            opacity={abLabelOp}
          >
            b²
          </text>
        </g>

        {tris.map((tri, i) => (
          <polygon
            key={i}
            points={polyStr(place(lerpPt(tri.from, tri.to, t), tri.deg))}
            style={{ fill: "var(--surface)", stroke: "var(--foreground)" }}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
        ))}
      </svg>

      <Button
        isIconOnly
        variant="accent"
        onPress={toggle}
        aria-label={atStart ? "Rearrange the pieces" : "Reset to original"}
        className="size-11"
      >
        {atStart ? (
          <PlayIcon className="size-5 shrink-0" />
        ) : (
          <UndoIcon className="size-5 shrink-0" />
        )}
      </Button>
      <p className="max-w-xs text-center text-sm text-muted" aria-live="polite">
        Same square, same triangles, so the gold area can't change.{" "}
        {atStart ? "Here it's one c² square." : "Here it's a² + b²."}
      </p>
    </div>
  );
}
