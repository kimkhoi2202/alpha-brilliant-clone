import { useNavigate } from "@tanstack/react-router";
import { motion, type Variants } from "motion/react";

import { Button } from "../../components/ui";
import {
  duration,
  easing,
  staggerContainer,
  staggerItem,
  useMotionEnabled,
  viewportOnce,
} from "../motion";
import { LandingSection, SectionHeading } from "../ui/section";

/**
 * "What you'll be able to do" — the honest stand-in for testimonials. The
 * product is pre-launch, so rather than ship fabricated (or labeled-placeholder)
 * quotes, this section proves value by specificity: the concrete skill you walk
 * away with from each of the five real lessons, plus the Level Review capstone.
 * Every line maps 1:1 to a real lesson in `content/course.ts`. When real learner
 * quotes exist, they can be added back as a separate, attributed block.
 *
 * Motion direction — "stagger + check-draw": this is a genuine list, so a
 * sibling stagger is legitimate. The outcome cards stagger into view (capped at
 * ~0.45s total) and each card's accent check-dot *draws* its checkmark (the SVG
 * `<path>` animates `pathLength` 0→1) a beat after the card lands, so every
 * outcome visibly "checks off." Transform + opacity + the stroke draw only —
 * ease-out, no bounce, fired once. Reduced motion / `?motion=off` → cards
 * visible and checks fully drawn, no transform.
 */
interface Outcome {
  /** The real lesson this capability comes from (from course.ts). */
  lesson: string;
  /** What the learner can do after it. Plain, specific, verifiable. */
  text: string;
}

const OUTCOMES: readonly Outcome[] = [
  {
    lesson: "The Right Triangle",
    text: "Name every part of a right triangle: the two legs, the hypotenuse, and the right angle.",
  },
  {
    lesson: "Discover the Theorem",
    text: "Prove a\u00B2 + b\u00B2 = c\u00B2 yourself by counting unit squares and rearranging four triangles.",
  },
  {
    lesson: "Find the Hypotenuse",
    text: "Find the hypotenuse: square the legs, add them, then take the square root.",
  },
  {
    lesson: "Find a Missing Leg",
    text: "Find a missing leg, and tell whether any triangle is a right triangle.",
  },
  {
    lesson: "Distance Between Points",
    text: "Measure the straight-line distance between two points on a grid.",
  },
  {
    lesson: "Level Review",
    text: "Then prove it: the chapter ends with a Level Review of ten mixed questions. Score eight of ten to pass.",
  },
];

/**
 * The check-dot draws its checkmark when its card scrolls into view: the
 * `<path>` animates `pathLength` 0→1, with a quick opacity gate so the round cap
 * never flashes a dot before the stroke. It inherits the `hidden`/`shown` state
 * from its card through Motion's variant context, so the card stagger also times
 * each draw — every outcome "checks off" a beat after it lands.
 */
const checkDraw: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: duration.slow, ease: easing.out, delay: 0.18 },
      opacity: { duration: 0.15, ease: easing.out, delay: 0.18 },
    },
  },
};

/** The accent check used across the page (hero / pricing), reused here. With
 *  motion on, the checkmark draws its stroke when the card enters view; with
 *  motion off the `<path>` renders fully drawn (no `pathLength` animation). */
function CheckDot({ motionEnabled }: { motionEnabled: boolean }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full"
      style={{
        backgroundColor: "color-mix(in oklab, var(--accent) 22%, transparent)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 13l4 4 10-10"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...(motionEnabled ? { variants: checkDraw } : {})}
        />
      </svg>
    </span>
  );
}

function OutcomeCard({
  outcome,
  motionEnabled,
}: {
  outcome: Outcome;
  motionEnabled: boolean;
}) {
  return (
    <motion.li
      className="flex h-full flex-col gap-4 rounded-2xl border-2 border-border bg-[var(--surface)] p-6"
      {...(motionEnabled ? { variants: staggerItem } : {})}
    >
      <CheckDot motionEnabled={motionEnabled} />
      <p className="text-base leading-relaxed text-foreground">{outcome.text}</p>
      <span className="mt-auto text-xs font-semibold uppercase tracking-wide text-muted">
        {outcome.lesson}
      </span>
    </motion.li>
  );
}

export function SocialProof() {
  const navigate = useNavigate();
  const motionEnabled = useMotionEnabled();

  return (
    <LandingSection id="reviews" width="wide">
      <SectionHeading
        title="What you'll be able to do."
        description="No testimonials to take on faith. Here is exactly what you can do by the time you finish, one real lesson at a time."
      />

      {/* A real list, so a sibling stagger is legitimate. `motion.ul` drives the
          stagger; each `motion.li` (and the check `<path>` nested inside it)
          inherits the hidden→shown state via Motion's variant context. Motion off
          → no props → final state, visible, with checks fully drawn. */}
      <motion.ul
        role="list"
        className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        {...(motionEnabled
          ? {
              initial: "hidden" as const,
              whileInView: "shown" as const,
              viewport: viewportOnce,
              variants: staggerContainer,
            }
          : {})}
      >
        {OUTCOMES.map((outcome) => (
          <OutcomeCard
            key={outcome.lesson}
            outcome={outcome}
            motionEnabled={motionEnabled}
          />
        ))}
      </motion.ul>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Button
          variant="accent"
          size="lg"
          onPress={() => void navigate({ to: "/auth" })}
        >
          Start learning, free
        </Button>
        <p className="text-sm text-muted">Free to start. No card required.</p>
      </div>
    </LandingSection>
  );
}
