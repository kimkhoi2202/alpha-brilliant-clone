/**
 * Deterministic achievement catalog (Phase 3). Predicates run over a facts
 * snapshot built in the learner store from data that already exists; only the
 * unlock moment is persisted (users/{uid}/achievements/{id}.unlockedAt), so the
 * shelf can show "NEW" badges and sort by recency.
 */
export type AchievementTier = "bronze" | "silver" | "gold";

export interface AchievementFacts {
  currentStreak: number;
  totalXp: number;
  /** Any lesson completed. */
  hasCompletedLesson: boolean;
  /** A completed lesson with every problem answered first-try. */
  hasPerfectLesson: boolean;
  /** Skills currently at mastery level `mastered`. */
  masteredCount: number;
  /** masteredCount >= 1 (survived a spaced review at least once). */
  firstMastery: boolean;
  /** A mastered skill that previously lapsed (returned to mastery). */
  hadComeback: boolean;
  /** The Level Review lesson is completed. */
  chapterComplete: boolean;
  /** Cumulative reviews completed across all days. */
  reviewsDone: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Emoji medal art (placeholder; the design pass may refine). */
  icon: string;
  tier: AchievementTier;
  predicate: (f: AchievementFacts) => boolean;
}

export const achievements: readonly Achievement[] = [
  {
    id: "first-lesson",
    title: "First steps",
    description: "Finish your first lesson.",
    icon: "🎯",
    tier: "bronze",
    predicate: (f) => f.hasCompletedLesson,
  },
  {
    id: "perfect-lesson",
    title: "Flawless",
    description: "Complete a lesson with every answer right on the first try.",
    icon: "✨",
    tier: "silver",
    predicate: (f) => f.hasPerfectLesson,
  },
  {
    id: "streak-3",
    title: "Warming up",
    description: "Reach a 3-day streak.",
    icon: "🔥",
    tier: "bronze",
    predicate: (f) => f.currentStreak >= 3,
  },
  {
    id: "streak-7",
    title: "On a roll",
    description: "Reach a 7-day streak.",
    icon: "🔥",
    tier: "silver",
    predicate: (f) => f.currentStreak >= 7,
  },
  {
    id: "streak-14",
    title: "Unstoppable",
    description: "Reach a 14-day streak.",
    icon: "🔥",
    tier: "gold",
    predicate: (f) => f.currentStreak >= 14,
  },
  {
    id: "first-mastery",
    title: "It stuck",
    description: "Master a skill by surviving a spaced review.",
    icon: "🧠",
    tier: "silver",
    predicate: (f) => f.firstMastery,
  },
  {
    id: "comeback",
    title: "Comeback",
    description: "Re-master a skill after a lapse.",
    icon: "↩️",
    tier: "silver",
    predicate: (f) => f.hadComeback,
  },
  {
    id: "theorem-master",
    title: "Theorem master",
    description: "Master all of the chapter's skills.",
    icon: "📐",
    tier: "gold",
    predicate: (f) => f.masteredCount >= 7,
  },
  {
    id: "chapter-complete",
    title: "Chapter complete",
    description: "Pass the Level Review.",
    icon: "🏆",
    tier: "gold",
    predicate: (f) => f.chapterComplete,
  },
  {
    id: "scholar-100",
    title: "Scholar",
    description: "Earn 100 XP.",
    icon: "⭐",
    tier: "bronze",
    predicate: (f) => f.totalXp >= 100,
  },
  {
    id: "scholar-300",
    title: "Dedicated",
    description: "Earn 300 XP.",
    icon: "🌟",
    tier: "gold",
    predicate: (f) => f.totalXp >= 300,
  },
  {
    id: "reviewer-10",
    title: "Memory keeper",
    description: "Complete 10 reviews.",
    icon: "🔁",
    tier: "silver",
    predicate: (f) => f.reviewsDone >= 10,
  },
] as const;

/** Ids whose predicate is currently satisfied. */
export function unlockedIds(f: AchievementFacts): string[] {
  return achievements.filter((a) => a.predicate(f)).map((a) => a.id);
}

export function getAchievement(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id);
}
