import { useState } from "react";

import { StreakCard, type StreakDay } from "../../components/gamification";
import {
  CountSquaresFigure,
  PlotPointsGrid,
  SliderInput,
} from "../../components/interactions";
import { AnswerChoice } from "../../components/lesson";
import { FeedbackToast } from "../../components/lesson/feedback-toast";
import { KojiMascot } from "../../components/lesson/koji";
import { RearrangementProof, RightTriangleFigure } from "../../components/visuals";
import type { GridPoint } from "../../content/types";
import { cn } from "../../lib/cn";
import { LandingSection, SectionHeading } from "../ui/section";

// Demo streak for the real StreakCard: Mon to Thu done, Friday in progress,
// the weekend still ahead.
const STREAK_DAYS: StreakDay[] = [
  { label: "M", state: "completed" },
  { label: "T", state: "completed" },
  { label: "W", state: "completed" },
  { label: "T", state: "completed" },
  { label: "F", state: "current" },
  { label: "S", state: "upcoming" },
  { label: "S", state: "upcoming" },
];

// Each verb in the "Problems you do, not watch" tile maps to a REAL lesson
// interaction, made fully usable inline. Selecting a verb swaps in its demo.
type VerbId = "drag" | "count" | "plot" | "rearrange";

const VERBS: { id: VerbId; label: string; hint: string }[] = [
  { id: "drag", label: "Drag", hint: "Drag a leg — the squares and c update live." },
  { id: "count", label: "Count", hint: "Type how many cells fill the gold square." },
  { id: "plot", label: "Plot", hint: "Tap the grid to plot a point." },
  {
    id: "rearrange",
    label: "Rearrange",
    hint: "Press play to slide the four triangles.",
  },
];

// Legs stay whole numbers in a friendly range so the figure always reads
// clearly and the squares stay countable (mirrors the hero playground).
const LEG_MIN = 2;
const LEG_MAX = 8;

/**
 * Drag — the hero pattern, reused: the real `RightTriangleFigure` reshaped live
 * by two design-system `SliderInput`s, with an a² + b² = c² readout that
 * recomputes as you drag. A fixed-height stage keeps the card from jumping.
 */
function DragDemo() {
  const [a, setA] = useState(4);
  const [b, setB] = useState(3);
  const sum = a * a + b * b;
  const c = Math.sqrt(sum);
  const cText = Number.isInteger(c) ? String(c) : `√${sum} ≈ ${c.toFixed(2)}`;

  return (
    <div className="flex w-full max-w-[15rem] flex-col gap-3">
      <div className="flex h-40 items-center justify-center">
        <RightTriangleFigure
          a={a}
          b={b}
          showSquares
          className="h-full w-full max-w-none"
        />
      </div>
      <p
        aria-live="polite"
        className="text-center text-xs tabular-nums text-muted"
      >
        <span className="font-semibold text-[var(--accent)]">
          {a}² + {b}²
        </span>{" "}
        = <span className="font-semibold text-[var(--warning)]">{sum}</span>, c ={" "}
        {cText}
      </p>
      <div className="flex flex-col gap-2">
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
 * Count — the real `CountSquaresFigure`: type the cell count straight into the
 * gold square (the 3×3 on leg a → 9). It grades to green the instant it matches.
 */
function CountDemo() {
  const a = 3;
  const b = 4;
  const target = a * a; // the gold square sits on leg a → 9 unit cells
  const [value, setValue] = useState<number | null>(null);
  const state =
    value === null ? "default" : value === target ? "correct" : "incorrect";

  return (
    <div className="w-full max-w-[17rem]">
      <CountSquaresFigure
        a={a}
        b={b}
        countSide="a"
        value={value}
        state={state}
        onChange={setValue}
      />
    </div>
  );
}

/**
 * Plot — the real `PlotPointsGrid`: tap lattice points to drop dots, each
 * drawing a guide line from the origin. Keeps the latest three points.
 */
function PlotDemo() {
  const target = 3;
  const [placed, setPlaced] = useState<GridPoint[]>([]);

  return (
    <div className="w-full max-w-[15rem]">
      <PlotPointsGrid
        size={5}
        placed={placed}
        targetCount={target}
        onPlace={(p) =>
          setPlaced((prev) =>
            prev.some((q) => q.x === p.x && q.y === p.y)
              ? prev
              : [...prev, p].slice(-target),
          )
        }
        onClear={() => setPlaced([])}
      />
    </div>
  );
}

/**
 * Rearrange — the self-contained `RearrangementProof`: press play and the four
 * triangles slide between the c² and a² + b² arrangements (it owns its own
 * reduced-motion handling).
 */
function RearrangeDemo() {
  return (
    <div className="w-full max-w-[14rem]">
      <RearrangementProof a={3} b={4} />
    </div>
  );
}

/**
 * The interactive heart of the "Problems you do, not watch" tile: a segmented
 * verb selector (static selected style, no sliding indicator) that swaps in the
 * matching REAL lesson interaction. Each demo is fully usable right here and
 * owns its own local state.
 */
function ProblemsPlayground() {
  const [verb, setVerb] = useState<VerbId>("drag");
  const active = VERBS.find((v) => v.id === verb) ?? VERBS[0];

  return (
    <div className="mt-5 flex flex-1 flex-col">
      <div
        role="group"
        aria-label="Choose an interaction to try"
        className="flex flex-wrap gap-2"
      >
        {VERBS.map((v) => {
          const selected = v.id === verb;
          return (
            <button
              key={v.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setVerb(v.id)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                selected
                  ? "border-accent bg-accent/15 text-foreground ring-1 ring-inset ring-accent"
                  : "border-border text-muted hover:border-[var(--border-hover)] hover:bg-surface hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted" aria-live="polite">
        {active.hint}
      </p>

      <div className="mt-4 flex min-h-[20rem] flex-1 items-center justify-center">
        {verb === "drag" ? <DragDemo /> : null}
        {verb === "count" ? <CountDemo /> : null}
        {verb === "plot" ? <PlotDemo /> : null}
        {verb === "rearrange" ? <RearrangeDemo /> : null}
      </div>
    </div>
  );
}

const tileBase = "flex flex-col rounded-2xl border-2 p-6 sm:p-7";
const neutralTile =
  "border-border bg-background transition-colors hover:border-[var(--border-hover)]";
const tileHeading =
  "text-lg font-bold tracking-[-0.01em] text-foreground sm:text-xl";

/**
 * Features bento, in the app's real dark skin. An asymmetric grid where every
 * tile embeds a genuine product moment: the graded AnswerChoice + instant
 * FeedbackToast, the lesson RightTriangleFigure, the animated KojiMascot, and the
 * real StreakCard. The Koji cell is the single focal accent tile. Nothing here
 * is a hand-rolled stand-in for a product component.
 */
export function Features() {
  return (
    <LandingSection id="features" width="wide">
      <SectionHeading
        eyebrow="What you get"
        title="Everything you need to actually get it."
        description="Hands-on problems, instant feedback, a tutor who nudges, and streaks that bring you back."
        id="features-heading"
      />

      <ul
        role="list"
        className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 md:grid-cols-2 lg:grid-cols-12 lg:gap-5"
      >
        {/* Instant feedback: the real graded AnswerChoice + FeedbackToast. */}
        <li
          className={cn(
            tileBase,
            neutralTile,
            "lg:col-span-3 lg:col-start-10 lg:row-start-1",
          )}
        >
          <h3 className={tileHeading}>Feedback before you blink</h3>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">
            Every answer is checked on your device in under 100 ms, so you always
            know why right away, with no network.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <p className="text-xs font-medium text-muted">
              Find c for the legs 3 and 4.
            </p>
            <AnswerChoice
              state="incorrect"
              align="center"
              disabled
              className="w-fit"
            >
              <span className="text-sm text-muted">You typed</span>{" "}
              <span className="text-base font-semibold tabular-nums text-foreground">
                7
              </span>
              <span className="sr-only"> — marked incorrect</span>
            </AnswerChoice>
            <FeedbackToast status="retryable">
              You added the legs (3 + 4). Square each one first: 3&#178; + 4&#178;,
              then add.
            </FeedbackToast>
          </div>
        </li>

        {/* Koji, the AI tutor: the focal accent cell, with the real animated KojiMascot. */}
        <li
          className={cn(
            tileBase,
            "items-center justify-center border-accent/40 bg-accent-soft text-center",
            "lg:col-span-4 lg:col-start-6 lg:row-start-1",
          )}
        >
          <div className="relative grid place-items-center">
            <div
              aria-hidden
              className="absolute inset-0 m-auto size-40 rounded-full bg-[color-mix(in_oklab,var(--accent)_16%,transparent)] blur-2xl"
            />
            <div
              role="img"
              aria-label="Koji, the AI tutor, idling in a lesson"
              className="relative"
            >
              <KojiMascot className="size-32" />
            </div>
          </div>
          <h3 className={cn(tileHeading, "mt-3")}>
            A tutor who nudges, never spoils
          </h3>
          <p className="mt-2 max-w-xs text-pretty text-sm leading-relaxed text-foreground/85">
            Stuck? Koji gives layered hints that stop short of the answer, names
            the exact mistake you made, and reveals a worked solution only after
            you have really tried.
          </p>
        </li>

        {/* Interactive problems: a live playground of the real lesson
            interactions (drag / count / plot / rearrange), the tall left anchor. */}
        <li
          className={cn(
            tileBase,
            neutralTile,
            "md:col-span-2 lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1",
          )}
        >
          <h3 className={tileHeading}>Problems you do, not watch</h3>
          <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted">
            Drag a triangle, count unit squares, plot points on a grid, and
            rearrange four triangles into a proof. Every lesson has at least one
            hands-on problem.
          </p>
          <ProblemsPlayground />
        </li>

        {/* Progress and streaks: the real StreakCard as a live product moment. */}
        <li
          className={cn(
            tileBase,
            neutralTile,
            "gap-6 md:col-span-2 lg:col-span-7 lg:col-start-6 lg:row-start-2 lg:flex-row lg:items-center lg:gap-10",
          )}
        >
          <div className="lg:flex-1">
            <h3 className={tileHeading}>Small reps that add up</h3>
            <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-muted">
              A daily streak rewards showing up. A few minutes a day keeps the
              momentum, and your progress is saved across every device.
            </p>
          </div>
          <StreakCard
            count={5}
            message="Keep your streak alive."
            days={STREAK_DAYS}
            className="w-full max-w-sm lg:w-[22rem] lg:shrink-0"
          />
        </li>
      </ul>
    </LandingSection>
  );
}
