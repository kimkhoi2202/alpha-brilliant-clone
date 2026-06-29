import { useReducedMotion } from "motion/react";

/**
 * Whether landing motion should run.
 *
 * False when the user prefers reduced motion, or when `?motion=off` is present in
 * the URL (a QA / headless-capture escape so every reveal renders at its final
 * state instead of waiting on a scroll trigger). When this returns false, motion
 * primitives render their children fully visible with no transform.
 */
export function useMotionEnabled(): boolean {
  const prefersReduced = useReducedMotion() ?? false;
  const forcedOff =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("motion") === "off";
  return !prefersReduced && !forcedOff;
}
