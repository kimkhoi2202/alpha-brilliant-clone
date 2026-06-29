import type { Transition } from "motion/react";

/**
 * Landing motion tokens. Exponential ease-out curves only (no bounce/elastic),
 * per impeccable `animate.md` + Emil. Bezier arrays are consumable directly by
 * Motion's `transition.ease`.
 */
type Bezier = [number, number, number, number];

export const easing: Record<"out" | "outExpo" | "outQuart" | "inOut", Bezier> = {
  /** ease-out-quint — the default reveal curve. */
  out: [0.22, 1, 0.36, 1],
  /** ease-out-expo — confident, decisive (hero, big reveals). */
  outExpo: [0.16, 1, 0.3, 1],
  /** ease-out-quart — smooth, subtle (small UI). */
  outQuart: [0.25, 1, 0.5, 1],
  /** ease-in-out — for on-screen elements that move or morph. */
  inOut: [0.65, 0, 0.35, 1],
};

/** Durations in seconds, following the 100/300/500 rule. */
export const duration = {
  micro: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.5,
  reveal: 0.6,
} as const;

/** Gentle, non-bouncy springs for an "alive" settle (no overshoot in UI). */
export const spring: Record<"gentle" | "snappy", Transition> = {
  gentle: { type: "spring", stiffness: 140, damping: 22, mass: 1 },
  snappy: { type: "spring", stiffness: 320, damping: 30 },
};

/** Default in-view trigger: fire once, when ~30% of the element is visible. */
export const viewportOnce = { once: true, amount: 0.3 } as const;

/** Fires a touch early — good for tall sections so motion isn't missed. */
export const viewportEarly = { once: true, margin: "0px 0px -15% 0px" } as const;
