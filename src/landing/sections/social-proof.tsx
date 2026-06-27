import { useNavigate } from "@tanstack/react-router";

import { Button } from "../../components/ui";
import { cn } from "../../lib/cn";
import { LandingSection, SectionHeading } from "../ui/section";

/**
 * "What you'll be able to do" — the honest stand-in for testimonials. The
 * product is pre-launch, so rather than ship fabricated (or labeled-placeholder)
 * quotes, this section proves value by specificity: the concrete skill you walk
 * away with from each of the five real lessons, plus the Level Review capstone.
 * Every line maps 1:1 to a real lesson in `content/course.ts`. When real learner
 * quotes exist, they can be added back as a separate, attributed block.
 */
interface Outcome {
  /** The real lesson this capability comes from (from course.ts). */
  lesson: string;
  /** What the learner can do after it. Plain, specific, verifiable. */
  text: string;
  /** The chapter-ending review: the "prove it" capstone, styled with accent. */
  capstone?: boolean;
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
    capstone: true,
  },
];

/** The accent check used across the page (hero / pricing), reused here. */
function CheckDot({ capstone }: { capstone?: boolean }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full"
      style={{
        backgroundColor: capstone
          ? "color-mix(in oklab, var(--warning) 24%, transparent)"
          : "color-mix(in oklab, var(--accent) 22%, transparent)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4 4 10-10"
          stroke={capstone ? "var(--warning)" : "var(--accent)"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  return (
    <li
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border-2 border-border bg-[var(--surface)] p-6",
        outcome.capstone && "border-[color:var(--warning)]/40 bg-[var(--warning-soft)]/20",
      )}
    >
      <CheckDot capstone={outcome.capstone} />
      <p className="text-base leading-relaxed text-foreground">{outcome.text}</p>
      <span className="mt-auto text-xs font-semibold uppercase tracking-wide text-muted">
        {outcome.lesson}
      </span>
    </li>
  );
}

export function SocialProof() {
  const navigate = useNavigate();

  return (
    <LandingSection id="reviews" width="wide">
      <SectionHeading
        eyebrow="By the end of the chapter"
        title="What you'll be able to do."
        description="No testimonials to take on faith. Here is exactly what you can do by the time you finish, one real lesson at a time."
      />

      <ul
        role="list"
        className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
      >
        {OUTCOMES.map((outcome) => (
          <OutcomeCard key={outcome.lesson} outcome={outcome} />
        ))}
      </ul>

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
