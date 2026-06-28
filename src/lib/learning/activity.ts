/**
 * Daily activity log (Phase 3): one doc per local day at
 * users/{uid}/activity/{YYYY-MM-DD}. Powers the daily-goal ring, weekly strip,
 * heatmap, and weekly-league XP. Written at the existing accrual chokepoints in
 * `lib/learner.tsx` (completeLesson / recordStep / recordReview).
 */
export interface DailyActivity {
  date: string;
  xp: number;
  lessonsCompleted: number;
  problemsSolved: number;
  reviewsDone: number;
}

/** XP for actions that previously granted none, so the daily goal is reachable. */
export const REVIEW_XP = 5;

/** Default daily XP target (≈ one lesson). Editable per learner. */
export const DEFAULT_DAILY_GOAL_XP = 30;

export function emptyActivity(date: string): DailyActivity {
  return { date, xp: 0, lessonsCompleted: 0, problemsSolved: 0, reviewsDone: 0 };
}

/** Sum a numeric field across a set of daily docs. */
export function sumField(
  days: DailyActivity[],
  key: keyof Omit<DailyActivity, "date">,
): number {
  return days.reduce((sum, day) => sum + (day[key] || 0), 0);
}
