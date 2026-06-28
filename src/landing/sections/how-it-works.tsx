import { useRef, type ReactNode } from "react";
import { motion, useInView, type Variants } from "motion/react";

import {
  Chip,
  type ChipIntent,
  Counter,
  ProgressBar,
} from "../../components/ui";
import { StreakBolt } from "../../components/chrome";
import { AnswerChoice } from "../../components/lesson";
import { FeedbackToast } from "../../components/lesson/feedback-toast";
import { RightTriangleFigure } from "../../components/visuals";
import { cn } from "../../lib/cn";
import { duration, easing, useMotionEnabled, viewportOnce } from "../motion";
import { LandingSection, SectionHeading } from "../ui/section";

/**
 * How it works — the manipulate-then-answer loop in three honest steps, shown
 * with the app's *real* lesson UI rather than marketing mock-ups. Each step is
 * colour-coded by the job that colour already does in the product (accent-blue =
 * play, gold = a hint on a miss, green = forward progress), and pairs its copy
 * with the actual component a learner meets in that moment: the lesson
 * `RightTriangleFigure`, a graded answer with the real `FeedbackToast` hint, and
 * the chapter `ProgressBar` + streak `Counter`/`StreakBolt`. Alternating rows
 * keep the three distinct and stack to a single column on mobile.
 *
 * Motion: each row reveals *directionally* — the text and visual columns enter
 * from opposite horizontal sides and converge into place, mirroring the
 * alternating layout instead of the uniform fade-up that reads as AI slop.
 */
type StepIntent = Extract<ChipIntent, "accent" | "warning" | "success">;

interface Step {
  n: number;
  intent: StepIntent;
  title: string;
  body: ReactNode;
  visual: ReactNode;
}

const INTENT_VAR: Record<StepIntent, string> = {
  accent: "var(--accent)",
  warning: "var(--warning)",
  success: "var(--success)",
};

/** Small horizontal travel for the converge-in reveal. Kept tiny so the
 * pre-reveal transform can never push a card past the viewport on mobile. */
const REVEAL_X = 24;

/** The real app card frame (rounded-2xl, 2px hairline) with a small context tag. */
function VisualCard({
  intent,
  tag,
  children,
}: {
  intent: StepIntent;
  tag: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-border bg-[var(--surface)] p-6 sm:p-7">
      <p className="mb-5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: INTENT_VAR[intent] }}
        />
        {tag}
      </p>
      {children}
    </div>
  );
}

/**
 * Step 3's visual: the real chapter `ProgressBar`. It fills the first time the
 * bar scrolls into view (not on mount), so the "momentum" fill is actually seen
 * rather than completing off-screen. Reduced-motion / `?motion=off` users land
 * on the final value with no animation (the bar's own width transition never
 * runs because the value starts at its target).
 */
function ChapterProgressVisual() {
  const target = 60;
  const enabled = useMotionEnabled();
  const barRef = useRef<HTMLDivElement>(null);
  const inView = useInView(barRef, { once: true, amount: 0.5 });
  const value = enabled ? (inView ? target : 0) : target;

  return (
    <VisualCard intent="success" tag="Your chapter">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Chapter progress</span>
        <Counter
          value="5"
          icon={<StreakBolt completed className="streak-bolt-pulse h-4 w-3" />}
          className="px-3 py-1 text-base"
          aria-label="Five day streak"
        />
      </div>
      <div ref={barRef} className="mt-3">
        <ProgressBar
          value={value}
          intent="success"
          aria-label="Chapter progress, 3 of 5 lessons complete"
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold tabular-nums text-foreground">
          3 of 5 lessons
        </span>
        <span className="text-muted">Up next: Find a missing leg</span>
      </div>
    </VisualCard>
  );
}

/**
 * One step row. The text and visual columns enter from opposite sides and
 * converge with a slight stagger; the "Step N" chip scales/fades in just after.
 * Reduced-motion / `?motion=off` renders the final, fully-visible layout with no
 * transform.
 */
function StepRow({ step, reversed }: { step: Step; reversed: boolean }) {
  const enabled = useMotionEnabled();
  const gridClass = "grid items-center gap-8 lg:grid-cols-2 lg:gap-14";
  const textColClass = cn("flex flex-col items-start gap-4", reversed && "lg:order-2");
  const visualColClass = cn(reversed && "lg:order-1");

  const heading = (
    <h3 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
      {step.title}
    </h3>
  );
  const bodyCopy = (
    <p className="max-w-[34rem] text-base leading-relaxed text-muted sm:text-lg">
      {step.body}
    </p>
  );

  if (!enabled) {
    return (
      <li className={gridClass}>
        <div className={textColClass}>
          <Chip intent={step.intent} variant="soft" size="sm">
            Step {step.n}
          </Chip>
          {heading}
          {bodyCopy}
        </div>
        <div className={visualColClass}>{step.visual}</div>
      </li>
    );
  }

  // Normal rows: text from the left, visual from the right. Reversed rows mirror
  // it so each column always slides in from its own side toward the centre.
  const textFrom = reversed ? REVEAL_X : -REVEAL_X;
  const visualFrom = reversed ? -REVEAL_X : REVEAL_X;

  const rowContainer: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
  };
  const column = (x: number): Variants => ({
    hidden: { opacity: 0, x },
    shown: {
      opacity: 1,
      x: 0,
      transition: { duration: duration.reveal, ease: easing.out },
    },
  });
  const chipReveal: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    shown: {
      opacity: 1,
      scale: 1,
      transition: { duration: duration.base, ease: easing.out, delay: 0.1 },
    },
  };

  return (
    <motion.li
      className={gridClass}
      variants={rowContainer}
      initial="hidden"
      whileInView="shown"
      viewport={viewportOnce}
    >
      <motion.div className={textColClass} variants={column(textFrom)}>
        <motion.div variants={chipReveal} className="origin-left">
          <Chip intent={step.intent} variant="soft" size="sm">
            Step {step.n}
          </Chip>
        </motion.div>
        {heading}
        {bodyCopy}
      </motion.div>
      <motion.div className={visualColClass} variants={column(visualFrom)}>
        {step.visual}
      </motion.div>
    </motion.li>
  );
}

export function HowItWorks() {
  const steps: Step[] = [
    {
      n: 1,
      intent: "accent",
      title: "Play before you name it",
      body: "Drag a right triangle, plot points, and count the squares on its sides. You act first, before any formula shows up.",
      visual: (
        <VisualCard intent="accent" tag="The right triangle">
          <RightTriangleFigure
            a={4}
            b={3}
            gridSquares
            labels
            className="max-w-[15rem]"
          />
          <p className="mt-4 text-center text-sm text-muted">
            Count the squares:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              9 + 16 = 25
            </span>
          </p>
        </VisualCard>
      ),
    },
    {
      n: 2,
      intent: "warning",
      title: "Every wrong answer teaches",
      body: "Each answer is checked on your device in under a tenth of a second. A wrong one gets a specific hint, never a bare red X.",
      visual: (
        <VisualCard intent="warning" tag="Find the hypotenuse">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">Your answer</span>
            <AnswerChoice
              state="incorrect"
              align="center"
              disabled
              className="w-fit tabular-nums"
            >
              c = 7<span className="sr-only"> — marked incorrect</span>
            </AnswerChoice>
          </div>
          <FeedbackToast status="retryable" layout="roomy" className="mt-4">
            You added the legs: 3 + 4 = 7. Square each side first, then add: 3² + 4².
          </FeedbackToast>
        </VisualCard>
      ),
    },
    {
      n: 3,
      intent: "success",
      title: "Momentum, not pressure",
      body: (
        <>
          When it clicks, the theorem is yours:{" "}
          <span className="font-semibold text-foreground">a² + b² = c²</span>. Each
          lesson builds on the last and your progress saves as you go, so a few
          minutes a day keeps you moving.
        </>
      ),
      visual: <ChapterProgressVisual />,
    },
  ];

  return (
    <LandingSection id="how-it-works">
      <SectionHeading
        title="You do the math, then we name it."
        description="The same loop runs through every lesson: act first, get a straight answer, and watch it add up."
      />

      <ol className="mt-14 space-y-12 overflow-x-clip sm:mt-16 sm:space-y-16 lg:space-y-24">
        {steps.map((step, i) => (
          <StepRow key={step.n} step={step} reversed={i % 2 === 1} />
        ))}
      </ol>
    </LandingSection>
  );
}
