import type { DailyActivity } from "../../lib/learner";

export type StreakDayState = "completed" | "current" | "upcoming";

export interface StreakDay {
  label: string;
  state: StreakDayState;
  /** Marks today's column (bolds the label regardless of done/current state). */
  today?: boolean;
}

const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/**
 * Map a week of daily activity (oldest first, as from `weekActivity()`) to the
 * streak-day discs: a day with XP is `completed`, today with none yet is
 * `current` (the "do it now" ring), any other empty day is `upcoming`. Shared by
 * the nav StreakMenu and the home StreakCard so both render the same week.
 */
export function toStreakDays(
  week: DailyActivity[],
  todayStr: string,
): StreakDay[] {
  return week.map((a) => {
    const [y, m, d] = a.date.split("-").map(Number);
    const label = WEEKDAY[new Date(y, m - 1, d).getDay()];
    const isToday = a.date === todayStr;
    return {
      label,
      state: a.xp > 0 ? "completed" : isToday ? "current" : "upcoming",
      today: isToday,
    };
  });
}
