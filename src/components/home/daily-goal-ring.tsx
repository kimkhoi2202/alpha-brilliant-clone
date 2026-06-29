import { useEffect, useState } from "react";

import { cn } from "../../lib/cn";

export interface DailyGoalRingProps {
  current: number;
  goal: number;
  /** Rendered diameter in px. */
  size?: number;
  className?: string;
}

// Geometry lives in a fixed 0–100 viewBox so the ring scales with `size`
// without recomputing radii. A thin-ish stroke keeps it tactile, not chunky.
const VIEWBOX = 100;
const STROKE = 8;
const RADIUS = (VIEWBOX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Circular daily-goal progress ring. Fills from empty to `current / goal` and
 * flips from the brand accent to `success` once the goal is reached. The sweep
 * rides on stroke-dashoffset and is skipped entirely under reduced motion.
 */
export function DailyGoalRing({
  current,
  goal,
  size = 120,
  className,
}: DailyGoalRingProps) {
  const ratio = goal > 0 ? Math.min(1, Math.max(0, current / goal)) : 0;
  const reached = goal > 0 && current >= goal;

  // Start empty and animate to the real ratio on mount (and on any later
  // change). Reduced-motion users get the final value immediately — paired with
  // `motion-reduce:transition-none` there's no empty flash and no sweep.
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() ? ratio : 0,
  );
  // Sweep to the real ratio after mount (and on change) via rAF — never a
  // synchronous setState in the effect body. Reduced-motion users start at the
  // final value (lazy init) and `motion-reduce:transition-none` skips the sweep.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(ratio));
    return () => cancelAnimationFrame(raf);
  }, [ratio]);

  const offset = CIRCUMFERENCE * (1 - shown);

  return (
    <div
      role="img"
      aria-label={`Daily goal: ${current} of ${goal} XP`}
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="block h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-[var(--border)]"
        />
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cn(
            "transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-quart)] motion-reduce:transition-none",
            reached ? "stroke-[var(--success)]" : "stroke-[var(--accent)]",
          )}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div className="leading-none">
          <span className="text-2xl font-bold tabular-nums text-foreground">
            {current}
          </span>
          <span className="mt-1 block text-xs font-medium tabular-nums text-muted">
            / {goal} XP
          </span>
        </div>
      </div>
    </div>
  );
}
