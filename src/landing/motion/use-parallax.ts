import type { RefObject } from "react";
import { useScroll, useTransform, type MotionValue } from "motion/react";

import { useMotionEnabled } from "./use-motion-enabled";

/**
 * Scroll-linked vertical parallax for an element. Spread the returned MotionValue
 * into `style={{ y }}` on a `motion.*` element. Transform-only (GPU), so it stays
 * cheap. Reduced motion / `?motion=off` collapses the range to 0 (no movement).
 *
 * `distance` is the peak offset in px (element drifts +distance → -distance as it
 * passes through the viewport).
 */
export function useParallax(
  ref: RefObject<HTMLElement | null>,
  { distance = 60 }: { distance?: number } = {},
): MotionValue<number> {
  const enabled = useMotionEnabled();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return useTransform(
    scrollYProgress,
    [0, 1],
    enabled ? [distance, -distance] : [0, 0],
  );
}

/**
 * Raw 0→1 scroll progress of an element through the viewport, for bespoke
 * scroll-linked effects (draw-in paths, scrubbed diagrams). Compose with
 * `useTransform`. Callers should gate visible movement on `useMotionEnabled()`.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return scrollYProgress;
}
