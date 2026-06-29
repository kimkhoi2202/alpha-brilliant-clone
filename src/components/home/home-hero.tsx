import { DailyGoalRing } from "./daily-goal-ring";
import { RecommendedCourseDeck } from "./recommended-course-deck";

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
  className?: string;
}

/**
 * Learner Home hero band. The greeting sits on top; below it two equal cards
 * fill the width: the recommended-course deck (the primary CTA) on the left, and
 * the daily-goal card (the daily-progress ring, centered in the card) on the
 * right. The goal target is set in Settings; streak lives in the stat strip and
 * the weekly card, so neither is repeated here. Presentational only — every
 * value arrives via props.
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

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-border bg-background p-6">
          <DailyGoalRing current={goalCurrent} goal={goal} />
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Daily goal
          </p>
        </div>
      </div>
    </div>
  );
}
