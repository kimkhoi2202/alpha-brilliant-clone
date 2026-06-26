import { StreakCard, type StreakDay } from "../../components/gamification";
import { FeedbackToast } from "../../components/lesson/feedback-toast";
import { KojiMascot } from "../../components/lesson/koji";
import { Chip, StateBadge } from "../../components/ui";
import { RightTriangleFigure } from "../../components/visuals";
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

// The four hands-on interaction verbs from the real lessons.
const INTERACTIONS = ["Drag", "Count", "Plot", "Rearrange"] as const;

const tileBase = "flex flex-col rounded-2xl border-2 p-6 sm:p-7";
const neutralTile =
  "border-border bg-background transition-colors hover:border-[var(--border-hover)]";
const tileHeading =
  "text-lg font-bold tracking-[-0.01em] text-foreground sm:text-xl";

/**
 * Features bento, in the app's real dark skin. An asymmetric grid where every
 * tile embeds a genuine product moment: the instant-feedback FeedbackToast +
 * StateBadge, the lesson RightTriangleFigure, the animated KojiMascot, and the
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
        {/* Instant feedback: the real FeedbackToast + StateBadge on a graded answer. */}
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
            <div className="relative inline-flex w-fit items-center gap-2 rounded-xl border-2 border-border bg-[var(--surface)] px-3 py-2">
              <span className="text-sm text-muted">You typed</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                7
              </span>
              <StateBadge state="incorrect" />
            </div>
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

        {/* Interactive problems: the real lesson figure, the tall left anchor. */}
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
          <div className="mt-4 flex flex-wrap gap-2">
            {INTERACTIONS.map((label) => (
              <Chip key={label} intent="neutral" size="sm">
                {label}
              </Chip>
            ))}
          </div>
          <div className="mt-6 flex flex-1 flex-col items-center justify-center">
            <RightTriangleFigure
              a={4}
              b={3}
              showSquares
              labels
              showHypotenuseValue
              className="w-full max-w-[17rem]"
            />
            <p className="mt-4 text-center text-xs text-muted">
              The two leg squares, 9 and 16, fill the 25 of the hypotenuse
              exactly.
            </p>
          </div>
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
