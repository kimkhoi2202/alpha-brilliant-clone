import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, type Transition } from "motion/react";

import { SliderInput } from "../../components/interactions";
import { Button } from "../../components/ui";
import { RightTriangleFigure } from "../../components/visuals";
import { duration, easing, useMotionEnabled, useParallax } from "../motion";
import { LandingSection } from "../ui/section";
import { scrollToId } from "../ui/scroll-to-id";

const TRUST = ["Free to start", "No credit card", "Built for mobile"];

/** Legs are constrained to whole numbers in a friendly range so the figure
 *  always reads clearly and the squares stay countable. */
const LEG_MIN = 2;
const LEG_MAX = 8;

/**
 * The live hero diagram — the app's whole thesis ("learn by touching it") in the
 * fold. It's not a picture of a lesson; it *is* one: the real lesson
 * `RightTriangleFigure` driven by two design-system `SliderInput`s for the legs,
 * with an a² + b² = c² readout that recomputes as you drag. Everything (the
 * squares, their areas, the hypotenuse) is derived from `a`/`b` by the same
 * component a learner uses, so it can never drift out of sync or be "wrong".
 */
function HeroPlayground() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);

  const sum = a * a + b * b;
  const c = Math.sqrt(sum);
  const cWhole = Number.isInteger(c);
  const cText = cWhole ? String(c) : `√${sum} ≈ ${c.toFixed(2)}`;

  return (
    <div className="rounded-2xl border-2 border-border bg-[var(--surface)] p-6 sm:p-8">
      {/* Fixed-height stage so the card never jumps as the triangle reshapes. */}
      <div className="flex h-60 items-center justify-center sm:h-64">
        <RightTriangleFigure
          a={a}
          b={b}
          showSquares
          className="h-full w-full max-w-none"
        />
      </div>

      {/* Live equation: the leg squares (accent) sum to c² (gold). */}
      <p
        aria-live="polite"
        className="mt-4 text-center text-sm tabular-nums text-muted"
      >
        <span className="font-semibold text-[var(--accent)]">
          {a}² + {b}²
        </span>{" "}
        ={" "}
        <span className="font-semibold text-[var(--warning)]">{sum}</span>, so{" "}
        <span className="font-semibold text-[var(--warning)]">c = {cText}</span>.
      </p>

      {/* The interactive part — drag a leg and watch everything respond. */}
      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
        <p className="text-xs font-medium text-muted">
          Drag a leg — the squares and c update live.
        </p>
        <SliderInput
          compact
          label="Base"
          min={LEG_MIN}
          max={LEG_MAX}
          step={1}
          value={a}
          onChange={setA}
        />
        <SliderInput
          compact
          label="Height"
          min={LEG_MIN}
          max={LEG_MAX}
          step={1}
          value={b}
          onChange={setB}
        />
      </div>
    </div>
  );
}

/**
 * Hero — the product-in-the-fold moment, in the app's real dark skin. Oversized
 * headline over a faint graph-paper field, paired with a *live* triangle
 * playground (the real `RightTriangleFigure` + `SliderInput`) so the very first
 * thing a visitor can do is touch the math. Reuses the brand `Button`; nothing
 * hand-rolled.
 */
export function Hero() {
  const navigate = useNavigate();
  const enabled = useMotionEnabled();

  // Scroll parallax for the graph-paper field. The hook collapses its range to 0
  // under reduced motion / `?motion=off`, so the field simply holds still.
  const fieldRef = useRef<HTMLDivElement>(null);
  const fieldY = useParallax(fieldRef, { distance: 40 });

  // First-load entrance: one fade + rise (+ optional settle scale), gated on
  // motion. Disabled returns no props, so the element renders at its final,
  // visible state with no transform (reduced-motion safe, zero layout shift).
  // This is above the fold, so it's a mount choreography (initial/animate), not
  // a whileInView reveal.
  const entrance = (
    delay: number,
    opts: {
      y?: number;
      scale?: number;
      duration?: number;
      ease?: Transition["ease"];
    } = {},
  ) => {
    if (!enabled) return {};
    const { y = 16, scale, duration: d = duration.reveal, ease = easing.out } = opts;
    const initial: { opacity: number; y: number; scale?: number } = { opacity: 0, y };
    const animate: { opacity: number; y: number; scale?: number } = { opacity: 1, y: 0 };
    if (scale != null) {
      initial.scale = scale;
      animate.scale = 1;
    }
    const transition: Transition = { duration: d, ease, delay };
    return { initial, animate, transition };
  };

  // The trust row lands last, its three badges cascading in a quick sibling
  // stagger (a legitimate list rhythm, not a whole-section fade).
  const trustContainer = enabled
    ? {
        initial: "hidden",
        animate: "shown",
        variants: {
          hidden: {},
          shown: { transition: { delayChildren: 0.42, staggerChildren: 0.06 } },
        },
      }
    : {};
  const trustItem = enabled
    ? {
        variants: {
          hidden: { opacity: 0, y: 10 },
          shown: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.45, ease: easing.out },
          },
        },
      }
    : {};

  return (
    <LandingSection id="top" width="wide" className="relative overflow-hidden pt-10 sm:pt-12">
      <div
        ref={fieldRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        style={{
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, #000 30%, transparent 78%)",
        }}
      >
        {/* Oversized so a ±40px parallax drift never exposes an edge; the wrapper
            keeps the radial vignette anchored while the dots drift behind it. */}
        <motion.div
          className="absolute inset-x-0 -inset-y-16"
          style={{
            y: fieldY,
            backgroundImage:
              "radial-gradient(color-mix(in oklab, var(--foreground) 9%, transparent) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <motion.h1
            className="text-balance text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-foreground"
            {...entrance(0.05, { duration: 0.65, ease: easing.outExpo })}
          >
            Learn the Pythagorean theorem by{" "}
            {/* The accent "lights up" a beat after the line lands — the brand's
                "each idea lights up the moment you touch it" made literal. */}
            <motion.span
              className="inline-block text-[var(--accent)]"
              {...entrance(0.18, { y: 10, duration: 0.55 })}
            >
              touching it
            </motion.span>
            .
          </motion.h1>

          <motion.p
            className="max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl"
            {...entrance(0.24, { duration: 0.55 })}
          >
            Drag the proof, plot points, rearrange the squares. You play with
            a&#178; + b&#178; = c&#178; until it clicks, instead of memorizing
            it. One chapter, genuinely mastered.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center gap-4"
            {...entrance(0.33, { duration: 0.5 })}
          >
            <Button variant="accent" size="lg" onPress={() => void navigate({ to: "/auth" })}>
              Start learning, free
            </Button>
            <Button variant="secondary" size="lg" onPress={() => scrollToId("how-it-works")}>
              See how it works
            </Button>
          </motion.div>

          <motion.ul
            className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted"
            {...trustContainer}
          >
            {TRUST.map((item) => (
              <motion.li
                key={item}
                className="inline-flex items-center gap-2"
                {...trustItem}
              >
                <span
                  aria-hidden
                  className="grid size-4 place-items-center rounded-full"
                  style={{ backgroundColor: "color-mix(in oklab, var(--accent) 22%, transparent)" }}
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
                {item}
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* The playground settles in just after the copy: fade + small rise + a
            subtle 0.98→1 scale (no bounce), so it reads as "arriving", not popping. */}
        <motion.div
          className="relative"
          {...entrance(0.3, { y: 24, scale: 0.98, duration: 0.7, ease: easing.outExpo })}
        >
          <HeroPlayground />
        </motion.div>
      </div>
    </LandingSection>
  );
}
