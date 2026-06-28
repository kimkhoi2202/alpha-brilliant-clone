/**
 * Deterministic weekly league (Phase 3 gamification). A synthetic cohort seeded
 * by (uid, weekStart) — stable for the week, accruing XP through it — blended
 * with the learner's live weekly XP. Geometry-themed tiers. Architected behind
 * this seam so a real global leaderboard can replace the cohort later without UI
 * changes (the UI only consumes `LeagueState`).
 */
export const LEAGUE_TIERS = [
  "Triangle",
  "Square",
  "Pentagon",
  "Hexagon",
  "Heptagon",
  "Octagon",
  "Nonagon",
  "Decagon",
] as const;

export const ADVANCE_COUNT = 5;
const COHORT_SIZE = 10; // 9 synthetic competitors + the learner
const COHORT_NAMES = [
  "Priya",
  "Marcus",
  "Lena",
  "Diego",
  "Sam",
  "Noah",
  "Maya",
  "Ivan",
  "Zoe",
  "Omar",
  "Aria",
  "Leo",
  "Nina",
  "Theo",
];

export interface LeagueMember {
  name: string;
  xp: number;
  you?: boolean;
}

export interface LeagueState {
  tierName: string;
  /** Ranked descending; the learner is flagged `you`. */
  members: LeagueMember[];
  advanceCount: number;
  daysLeft: number;
}

/** Stable 32-bit hash of a string (xmur3-style) for seeding. */
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — deterministic stream from a numeric seed. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLeague(opts: {
  /** `${uid}:${weekStart}` — stable for the week. */
  seed: string;
  learnerName: string;
  learnerWeeklyXp: number;
  /** 0-based tier index; higher = stronger cohort. */
  tier: number;
  /** 0 (Mon) … 6 (Sun): fraction of the week elapsed. */
  dayOfWeek: number;
  daysLeft: number;
}): LeagueState {
  const rnd = mulberry32(hashSeed(opts.seed));
  const tierBoost = 1 + opts.tier * 0.25;
  const elapsed = (opts.dayOfWeek + 1) / 7;

  const names = [...COHORT_NAMES]
    .sort(() => rnd() - 0.5)
    .slice(0, COHORT_SIZE - 1);

  const bots: LeagueMember[] = names.map((name) => {
    const weekTarget = Math.round((40 + rnd() * 140) * tierBoost); // 40–180 * boost
    const xp = Math.round(weekTarget * elapsed * (0.7 + rnd() * 0.6));
    return { name, xp: Math.max(0, xp) };
  });

  const me: LeagueMember = {
    name: opts.learnerName || "You",
    xp: opts.learnerWeeklyXp,
    you: true,
  };

  const members = [...bots, me].sort((a, b) => b.xp - a.xp);
  const tierName = LEAGUE_TIERS[Math.min(opts.tier, LEAGUE_TIERS.length - 1)];
  return { tierName, members, advanceCount: ADVANCE_COUNT, daysLeft: opts.daysLeft };
}
