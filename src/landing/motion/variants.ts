import type { Variants } from "motion/react";

import { duration, easing } from "./tokens";

/**
 * Reusable Motion variants for use directly on `motion.*` elements when a wrapper
 * component would break a grid/flex layout (e.g. animate the real `<li>` instead
 * of nesting one). Pair `revealUp` with `initial="hidden" whileInView="shown"`.
 * Kept separate from `reveal.tsx` so that file only exports components (fast refresh).
 */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.reveal, ease: easing.out },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.out },
  },
};
