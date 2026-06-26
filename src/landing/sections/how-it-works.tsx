import { useEffect, useState, type ReactNode } from "react";

import {
  Callout,
  Chip,
  type ChipIntent,
  Counter,
  ProgressBar,
  StateBadge,
} from "../../components/ui";
import { RightTriangleFigure } from "../../components/visuals";
import { cn } from "../../lib/cn";
import { Eyebrow, LandingSection } from "../ui/section";

/**
 * How it works — the manipulate-then-answer loop in three honest steps, shown
 * with the app's *real* lesson UI rather than marketing mock-ups. Each step is
 * colour-coded by the job that colour already does in the product (accent-blue =
 * play, gold = a hint on a miss, green = forward progress), and pairs its copy
 * with the actual component a learner meets in that moment: the lesson
 * `RightTriangleFigure`, a graded answer with the real `Callout` hint, and the
 * chapter `ProgressBar` + streak `Counter`. Alternating rows keep the three
 * distinct and stack to a single column on mobile.
 */
type StepIntent = Extract<ChipIntent, "accent" | "warning" | "success">;

const INTENT_VAR: Record<StepIntent, string> = {
  accent: "var(--accent)",
  warning: "var(--warning)",
  success: "var(--success)",
};

/** Lucide-style flame, drawn in the app's streak amber (matches the nav pill). */
function FlameIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        stroke="var(--streak-flame)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
    <div className="rounded-2xl border-2 border-border bg-[var(--surface)] p-6 transition-colors hover:border-[color:var(--border-hover)] sm:p-7">
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
 * Step 3's visual: the real chapter `ProgressBar` that fills once on mount, so
 * "momentum" is felt rather than asserted. Reduced-motion users land on the
 * final value with no animation.
 */
function ChapterProgressVisual() {
  const target = 60;
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    const id = window.requestAnimationFrame(() => setValue(target));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <VisualCard intent="success" tag="Your chapter">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Chapter progress</span>
        <Counter
          value="5"
          icon={<FlameIcon />}
          className="px-3 py-1 text-base"
          aria-label="Five day streak"
        />
      </div>
      <ProgressBar
        value={value}
        intent="success"
        className="mt-3"
        aria-label="Chapter progress, 3 of 5 lessons complete"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold tabular-nums text-foreground">
          3 of 5 lessons
        </span>
        <span className="text-muted">Up next: Find a missing leg</span>
      </div>
    </VisualCard>
  );
}

export function HowItWorks() {
  const steps: {
    n: number;
    intent: StepIntent;
    title: string;
    body: ReactNode;
    visual: ReactNode;
  }[] = [
    {
      n: 1,
      intent: "accent",
      title: "Play before you name it",
      body: "Drag a right triangle, plot points, and count the squares on its sides. You act first, before any formula shows up.",
      visual: (
        <VisualCard intent="accent" tag="Lesson 1 · The right triangle">
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
        <VisualCard intent="warning" tag="Lesson 3 · Find the hypotenuse">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">Your answer</span>
            <span className="relative inline-flex">
              <Chip intent="neutral" variant="solid" size="md" className="tabular-nums">
                c = 7
              </Chip>
              <StateBadge state="incorrect" />
              <span className="sr-only">Marked incorrect.</span>
            </span>
          </div>
          <Callout intent="warning" title="Not quite" className="mt-4">
            You added the legs: 3 + 4 = 7. Square each side first, then add: 3² + 4².
          </Callout>
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
      <header className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 text-balance text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground">
          You do the math, then we name it.
        </h2>
        <p className="mt-4 max-w-[42rem] text-lg leading-relaxed text-muted">
          The same loop runs through every lesson: act first, get a straight
          answer, and watch it add up.
        </p>
      </header>

      <ol className="mt-14 space-y-12 sm:mt-16 sm:space-y-16 lg:space-y-24">
        {steps.map((step, i) => {
          const reversed = i % 2 === 1;
          return (
            <li
              key={step.n}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              <div
                className={cn(
                  "flex flex-col items-start gap-4",
                  reversed && "lg:order-2",
                )}
              >
                <Chip intent={step.intent} variant="soft" size="sm">
                  Step {step.n}
                </Chip>
                <h3 className="text-2xl font-bold tracking-[-0.02em] text-foreground sm:text-3xl">
                  {step.title}
                </h3>
                <p className="max-w-[34rem] text-base leading-relaxed text-muted sm:text-lg">
                  {step.body}
                </p>
              </div>
              <div className={cn(reversed && "lg:order-1")}>{step.visual}</div>
            </li>
          );
        })}
      </ol>

      <p className="mt-12 text-sm text-muted sm:mt-16">
        Then the next idea starts the loop again.
      </p>
    </LandingSection>
  );
}
