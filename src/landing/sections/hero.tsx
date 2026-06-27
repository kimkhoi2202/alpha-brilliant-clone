import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { SliderInput } from "../../components/interactions";
import { Button } from "../../components/ui";
import { RightTriangleFigure } from "../../components/visuals";
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
    <div className="rounded-3xl border-2 border-border bg-[var(--surface)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:p-8">
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

  return (
    <LandingSection id="top" width="wide" className="relative overflow-hidden pt-10 sm:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--foreground) 9%, transparent) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 35%, #000 30%, transparent 78%)",
        }}
      />

      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <h1 className="text-balance text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.03] tracking-[-0.03em] text-foreground">
            Learn the Pythagorean theorem by{" "}
            <span className="text-[var(--accent)]">touching it</span>.
          </h1>

          <p className="max-w-[34rem] text-lg leading-relaxed text-muted sm:text-xl">
            Drag the proof, plot points, rearrange the squares. You play with
            a&#178; + b&#178; = c&#178; until it clicks, instead of memorizing
            it. One chapter, genuinely mastered.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Button variant="accent" size="lg" onPress={() => void navigate({ to: "/auth" })}>
              Start learning, free
            </Button>
            <Button variant="secondary" size="lg" onPress={() => scrollToId("how-it-works")}>
              See how it works
            </Button>
          </div>

          <ul className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
            {TRUST.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
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
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <HeroPlayground />
        </div>
      </div>
    </LandingSection>
  );
}
