import { RearrangementProof, RightTriangleFigure } from "../../components/visuals";
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
 */
export function InteractiveProof() {
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
        eyebrow="See it click"
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
        {/* Focal: the real interactive rearrangement proof. */}
        <div className="flex flex-col rounded-3xl border-2 border-border bg-[var(--surface)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)] sm:p-8 lg:p-10">
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
            <RearrangementProof a={3} b={4} />
          </div>
        </div>

        {/* Support: the same 3-4-5, counted. The figure resolves to the
            equation and a plain-language cell count. */}
        <div className="flex flex-col rounded-2xl border-2 border-border bg-background p-6 sm:p-8">
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

          <p className="mt-7 text-center text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">
            <span className="text-[var(--accent)]">3&#178;</span>
            <span className="text-muted"> + </span>
            <span className="text-[var(--accent)]">4&#178;</span>
            <span className="text-muted"> = </span>
            <span className="text-[var(--warning)]">5&#178;</span>
          </p>
          <p className="mt-3 text-center text-sm leading-relaxed text-muted">
            9 cells plus 16 cells fill the 25-cell square exactly.
          </p>
        </div>
      </div>
    </LandingSection>
  );
}
