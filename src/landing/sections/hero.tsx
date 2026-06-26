import { useNavigate } from "@tanstack/react-router";

import { Button } from "../../components/ui";
import { RightTriangleFigure } from "../../components/visuals";
import { LandingSection, scrollToId } from "../ui/section";

const TRUST = ["Free to start", "No credit card", "Built for mobile"];

/**
 * Hero — the product-in-the-fold moment, in the app's real dark skin. Oversized
 * headline over a faint graph-paper field, paired with the app's actual
 * `RightTriangleFigure` (the color-coded 3-4-5 with counted unit cells) in a
 * real app card. Reuses the brand `Button`; nothing hand-rolled.
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
          <div className="rounded-3xl border-2 border-border bg-[var(--surface)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:p-8">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                className="grid size-6 place-items-center rounded-md text-[var(--accent)]"
                style={{ backgroundColor: "color-mix(in oklab, var(--accent) 16%, transparent)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 19 V5 L19 19 Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
                </svg>
              </span>
              Lesson 1 &middot; The 3-4-5 triangle
            </div>

            <RightTriangleFigure
              a={4}
              b={3}
              gridSquares
              labels
              showHypotenuseValue
              className="max-w-[18rem]"
            />

            <p className="mt-5 text-center text-sm text-muted">
              Count the squares:{" "}
              <span className="font-semibold tabular-nums text-foreground">9 + 16 = 25</span>, so{" "}
              <span className="font-semibold text-[var(--warning)]">c = 5</span>.
            </p>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
