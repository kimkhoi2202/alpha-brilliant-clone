import type { ReactNode } from "react";
import { motion, type Variants } from "motion/react";

import { RearrangementProof, RightTriangleFigure } from "../../components/visuals";
import { duration, easing, useMotionEnabled, viewportEarly } from "../motion";
import { LandingSection, SectionHeading } from "../ui/section";

/** Small play triangle, echoing the proof's own play control (a tinted accent
 *  chip in the card header, mirroring the hero card's lesson tag). */
function PlayTag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 6.5 18 12l-9 5.5z" />
    </svg>
  );
}

/** One term of the assembling `3² + 4² = 5²` equation: it pops (fade + a slight
 *  scale, ease-out, no bounce) in DOM order as the support card comes into view.
 *  `inline-block` is required so the transform actually applies to the text. */
const equationTerm: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.85 },
  shown: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.base, ease: easing.out },
  },
};

/** A single equation term. With motion off it's a plain inline span rendered at
 *  its final, fully-visible state (no transform), so the equation always reads. */
function Term({
  enabled,
  className,
  children,
}: {
  enabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!enabled) return <span className={className}>{children}</span>;
  return (
    <motion.span variants={equationTerm} className={`inline-block ${className ?? ""}`}>
      {children}
    </motion.span>
  );
}

/**
 * Interactive proof — the page's centerpiece. Instead of describing the
 * theorem, it hands the visitor the app's two real lesson figures and lets the
 * math do the talking:
 *
 *  - the star is the app's actual `RearrangementProof` (the self-contained
 *    play-to-morph proof: four triangles slide between a c² arrangement and an
 *    a² + b² one inside one fixed square, so the gold leftover is conserved);
 *  - it's backed by the real `RightTriangleFigure` showing the counted 3-4-5
 *    cells, so the same fact reads a second way: 9 + 16 = 25.
 *
 * Nothing here is hand-rolled UI: both figures are the verbatim components the
 * lessons use, dropped into the app's real card pattern. They own their own
 * `prefers-reduced-motion` handling and accessible labels.
 *
 * Motion direction: the two cards rise/scale into view (focal first, support a
 * beat later) and the equation assembles term by term. The focal
 * `RearrangementProof` keeps its own play control — it opens on the c² square and
 * the visitor presses play to watch the theorem hold (it is not auto-played).
 */
export function InteractiveProof() {
  const motionEnabled = useMotionEnabled();

  // Each card rises + settles with a touch of scale when it scrolls into view;
  // the support card follows the focal one by a beat. Transform + opacity only,
  // ease-out, fired once. Motion off → no props → final state, instantly visible.
  const cardReveal = (delay: number) =>
    motionEnabled
      ? {
          initial: { opacity: 0, y: 24, scale: 0.98 },
          whileInView: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { duration: duration.reveal, ease: easing.out, delay },
          },
          viewport: viewportEarly,
        }
      : {};

  // The equation assembles: its terms stagger in once the support card is in
  // view, a beat after the card itself has risen (delayChildren).
  const equationAssembly = motionEnabled
    ? {
        initial: "hidden" as const,
        whileInView: "shown" as const,
        viewport: { once: true, amount: 0.7 },
        variants: {
          hidden: {},
          shown: { transition: { delayChildren: 0.3, staggerChildren: 0.09 } },
        } satisfies Variants,
      }
    : {};

  return (
    <LandingSection id="proof" width="wide" className="relative overflow-hidden">
      {/* Section art direction: a soft blue glow (the legs) meeting a gold one
          (the hypotenuse square), the proof's own two colors, behind opaque
          cards so body contrast is untouched. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(38rem 30rem at 28% 22%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%), radial-gradient(34rem 30rem at 82% 88%, color-mix(in oklab, var(--warning) 11%, transparent), transparent 72%)",
        }}
      />

      <SectionHeading
        title={
          <>
            Don&apos;t read the theorem.{" "}
            <span className="text-[var(--accent)]">Move it.</span>
          </>
        }
        description={
          <>
            Press play and the same four triangles slide inside the same square,
            so the gold leftover can never change. First it reads as one c&#178;
            square, then as a&#178; + b&#178;. You watch the theorem hold before
            anyone writes it down.
          </>
        }
      />

      <div className="mt-12 grid items-stretch gap-6 lg:mt-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-8">
        {/* Focal: the real interactive rearrangement proof. It owns its play
            control and reduced-motion handling. */}
        <motion.div
          className="flex flex-col rounded-2xl border-2 border-border bg-[var(--surface)] p-6 sm:p-8 lg:p-10"
          {...cardReveal(0)}
        >
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-foreground">
            <span
              className="grid size-6 place-items-center rounded-md text-[var(--accent)]"
              style={{ backgroundColor: "color-mix(in oklab, var(--accent) 16%, transparent)" }}
            >
              <PlayTag className="size-3" />
            </span>
            Lesson 2 &middot; Discover the theorem
          </div>

          <div className="flex flex-1 items-center justify-center py-2">
            {/* Opens on the c² arrangement; the visitor presses play to morph it
                to a² + b² (and back). */}
            <RearrangementProof a={3} b={4} />
          </div>
        </motion.div>

        {/* Support: the same 3-4-5, counted. The figure resolves to the
            equation and a plain-language cell count. */}
        <motion.div
          className="flex flex-col rounded-2xl border-2 border-border bg-[var(--surface)] p-6 sm:p-8"
          {...cardReveal(0.1)}
        >
          <p className="mb-6 text-sm font-semibold text-muted">
            Or just count the cells
          </p>

          <div className="flex flex-1 items-center justify-center">
            <RightTriangleFigure
              a={3}
              b={4}
              gridSquares
              labels
              showHypotenuseValue
              className="max-w-[16rem]"
            />
          </div>

          <motion.p
            className="mt-7 text-center text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl"
            {...equationAssembly}
          >
            <Term enabled={motionEnabled} className="text-[var(--accent)]">3&#178;</Term>
            {" "}
            <Term enabled={motionEnabled} className="text-muted">+</Term>
            {" "}
            <Term enabled={motionEnabled} className="text-[var(--accent)]">4&#178;</Term>
            {" "}
            <Term enabled={motionEnabled} className="text-muted">=</Term>
            {" "}
            <Term enabled={motionEnabled} className="text-[var(--warning)]">5&#178;</Term>
          </motion.p>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted">
            9 cells plus 16 cells fill the 25-cell square exactly.
          </p>
        </motion.div>
      </div>
    </LandingSection>
  );
}
