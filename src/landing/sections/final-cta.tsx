import { useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";

import { Button } from "../../components/ui";
import { Meteors } from "../../components/ui/meteors";
import { duration, easing, useMotionEnabled, viewportOnce } from "../motion";
import { LandingSection, SectionHeading } from "../ui/section";
import { scrollToId } from "../ui/scroll-to-id";

/**
 * The band's confident entrance — the page's climax. A scale-in (0.97→1) + fade
 * + small rise, an expo curve so it lands harder than a standard reveal (never
 * bouncy). It also orchestrates its children: the heading / buttons / trust line
 * settle a beat after.
 */
const bandVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: easing.outExpo,
      delayChildren: 0.18,
      staggerChildren: 0.08,
    },
  },
};

/** The inner content settles in just behind the band — a subtle rise + fade. */
const contentVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.out },
  },
};

/**
 * Final CTA — the page's climax. A self-contained, accent-lit band (set apart
 * from the flat sections above) that closes on a single decision: start.
 * Composes the app's real `Button` (the brand `accent` "Start") so reaching the
 * end of the page feels like finishing a lesson. Nothing here is hand-rolled
 * chrome.
 */
export function FinalCTA() {
  const navigate = useNavigate();
  const motionEnabled = useMotionEnabled();

  // Activate the choreography only when motion is allowed. When it isn't, the
  // band and its children render at their natural (final) state — fully visible,
  // no transform — and the accent glow simply becomes a static separation layer.
  const bandMotion = motionEnabled
    ? ({ initial: "hidden", whileInView: "shown", viewport: viewportOnce } as const)
    : {};

  return (
    <LandingSection id="start">
      <motion.div
        variants={bandVariants}
        {...bandMotion}
        className="relative isolate overflow-hidden rounded-2xl border-2 border-border bg-[var(--surface)] px-6 py-16 text-center sm:px-12 sm:py-20"
      >
        {/* Ambient meteor shower — the only background effect on the band now
            (the accent glow was removed). Clipped to the card by `overflow-hidden`,
            behind the content (-z-10); stops under reduced motion via globals.css. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <Meteors number={20} />
        </div>

        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <motion.div variants={contentVariants} className="w-full">
            <SectionHeading
              title={
                <>
                  Ready to make it{" "}
                  <span className="text-[var(--accent)]">click</span>?
                </>
              }
              description="Start with one triangle. The rest of the theorem follows."
            />
          </motion.div>

          <motion.div
            variants={contentVariants}
            className="mt-9 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:justify-center"
          >
            <Button
              variant="accent"
              size="lg"
              className="w-full sm:w-auto"
              onPress={() => void navigate({ to: "/auth" })}
            >
              Start learning, free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onPress={() => scrollToId("koji")}
            >
              Meet Koji
            </Button>
          </motion.div>

          <motion.p
            variants={contentVariants}
            className="mt-6 inline-flex items-center gap-2 text-sm text-muted"
          >
            <span
              aria-hidden
              className="grid size-4 place-items-center rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--accent) 22%, transparent)",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4 10-10"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Free to start. No card required.
          </motion.p>
        </div>
      </motion.div>
    </LandingSection>
  );
}
