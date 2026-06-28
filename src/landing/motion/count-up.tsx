import { useEffect, useRef, useState } from "react";
import { useInView } from "motion/react";

import { useMotionEnabled } from "./use-motion-enabled";

interface CountUpProps {
  /** The final value to count to. */
  value: number;
  /** Decimal places to render. */
  decimals?: number;
  /** Count duration in ms. */
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Counts a number up once when scrolled into view. Always `tabular-nums` so the
 * width never jumps (no layout shift). Reduced motion / `?motion=off` shows the
 * final value immediately.
 */
export function CountUp({
  value,
  decimals = 0,
  durationMs = 900,
  prefix = "",
  suffix = "",
  className,
}: CountUpProps) {
  const enabled = useMotionEnabled();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [progressValue, setProgressValue] = useState(0);

  useEffect(() => {
    if (!enabled || !inView) return;
    let raf = 0;
    const start = performance.now();
    // ease-out-quart, matching the motion tokens.
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setProgressValue(value * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, inView, value, durationMs]);

  // When motion is off we render the final value directly (no state, no shift).
  const shown = enabled ? progressValue : value;

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}
