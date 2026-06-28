import { cn } from "../../lib/cn";
import { DailyGoalRing } from "./daily-goal-ring";
import { RecommendedCourseDeck } from "./recommended-course-deck";

/** Selectable daily XP targets. */
const GOAL_OPTIONS = [20, 30, 50] as const;

export interface HomeHeroProps {
  greeting: string;
  subtitle: string;
  courseTitle: string;
  level?: string;
  actionLabel: string;
  nextLessonLabel?: string;
  onPrimary: () => void;
  goalCurrent: number;
  goal: number;
  /** Set the learner's daily XP goal (the segmented picker under the ring). */
  onSetGoal: (xp: number) => void;
  className?: string;
}

/**
 * Learner Home hero band. The greeting sits on top; below it two equal cards
 * fill the width: the recommended-course deck (the primary CTA) on the left, and
 * the daily-goal card (ring + picker, centered in the card) on the right. Streak
 * lives in the stat strip and the weekly card, so it isn't repeated here.
 * Presentational only — every value arrives via props.
 */
export function HomeHero({
  greeting,
  subtitle,
  courseTitle,
  level,
  actionLabel,
  nextLessonLabel,
  onPrimary,
  goalCurrent,
  goal,
  onSetGoal,
  className,
}: HomeHeroProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
        {greeting}
      </h1>
      <p className="mt-2 max-w-prose text-muted">{subtitle}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 sm:items-stretch">
        <RecommendedCourseDeck
          flat
          course={courseTitle}
          level={level}
          nextLesson={nextLessonLabel}
          actionLabel={actionLabel}
          onStart={onPrimary}
          className="w-full"
        />

        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-border bg-background p-6">
          <DailyGoalRing current={goalCurrent} goal={goal} />
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Daily goal
            </p>
            <div
              role="group"
              aria-label="Daily goal in XP"
              className="inline-flex rounded-full border border-border bg-surface p-0.5"
            >
              {GOAL_OPTIONS.map((opt) => {
                const active = opt === goal;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSetGoal(opt)}
                    className={cn(
                      "rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
