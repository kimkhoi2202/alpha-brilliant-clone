import { useLearner } from "../lib/learner";

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
}

/** Streak view derived from the learner profile. */
export function useStreak(): StreakInfo {
  const { profile } = useLearner();
  return {
    currentStreak: profile?.currentStreak ?? 0,
    longestStreak: profile?.longestStreak ?? 0,
    lastActiveDate: profile?.lastActiveDate ?? null,
  };
}
