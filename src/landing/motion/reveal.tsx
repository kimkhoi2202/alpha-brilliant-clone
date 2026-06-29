import type { ElementType, ReactNode } from "react";
import { motion } from "motion/react";

import { duration, easing, viewportOnce } from "./tokens";
import { useMotionEnabled } from "./use-motion-enabled";

/**
 * Tags the reveal primitives can render as. Kept to a safe set so `motion[as]`
 * type-checks cleanly. Add here if a section genuinely needs another element.
 * (Reusable variants live in `variants.ts` so this file only exports components.)
 */
type MotionTagName =
  | "div"
  | "section"
  | "article"
  | "ul"
  | "ol"
  | "li"
  | "p"
  | "span"
  | "h1"
  | "h2"
  | "h3"
  | "a";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Element to render. Defaults to `div`. */
  as?: MotionTagName;
  /** Rise distance in px. */
  y?: number;
  /** Delay before the reveal, in seconds. */
  delay?: number;
  /** Intersection amount (0-1) before firing. Defaults to the shared 0.3. */
  amount?: number;
}

/**
 * A single fade + rise reveal that fires once when scrolled into view. Use
 * sparingly and vary the treatment per section — a uniform fade-up everywhere is
 * the AI tell. Reduced motion / `?motion=off` renders children visible instantly.
 */
export function Reveal({
  children,
  className,
  as = "div",
  y = 16,
  delay = 0,
  amount,
}: RevealProps) {
  const enabled = useMotionEnabled();

  if (!enabled) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: { duration: duration.reveal, ease: easing.out, delay },
      }}
      viewport={{ ...viewportOnce, ...(amount != null ? { amount } : {}) }}
    >
      {children}
    </MotionTag>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  as?: MotionTagName;
  /** Seconds between each child's entrance. Cap total stagger ≤ ~0.5s. */
  gap?: number;
  amount?: number;
}

/**
 * A container that staggers its `<StaggerItem>` children into view. Legitimate
 * for true lists/grids (cards, badges), never as a whole-section fade.
 */
export function Stagger({
  children,
  className,
  as = "div",
  gap = 0.08,
  amount,
}: StaggerProps) {
  const enabled = useMotionEnabled();

  if (!enabled) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ ...viewportOnce, ...(amount != null ? { amount } : {}) }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: gap, delayChildren: 0.05 } },
      }}
    >
      {children}
    </MotionTag>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  as?: MotionTagName;
  y?: number;
}

/** A child of `<Stagger>`. Inherits the parent's in-view trigger. */
export function StaggerItem({
  children,
  className,
  as = "div",
  y = 14,
}: StaggerItemProps) {
  const enabled = useMotionEnabled();

  if (!enabled) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: duration.slow, ease: easing.out },
        },
      }}
    >
      {children}
    </MotionTag>
  );
}
