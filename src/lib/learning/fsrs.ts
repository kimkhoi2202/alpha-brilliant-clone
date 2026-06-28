// FSRS-6 minimal, dependency-free TypeScript port (deterministic, day-grained).
// Faithful to open-spaced-repetition/fsrs-rs src/model.rs + src/inference.rs.
// Ported + unit-test-validated against the Rust/Anki reference (Brainlift §B.1);
// copied verbatim into the app as the per-skill scheduler — the math is NOT
// modified here (Phase 3, SPOV 7: ship the published defaults).

export type Grade = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface SkillMemory {
  difficulty: number; // D, clamped [1,10]
  stability: number; // S, in days (0 = never reviewed / "new")
  lastReviewed: number | null; // epoch ms
  dueAt: number; // epoch ms
}

// fsrs-rs DEFAULT_PARAMETERS (FSRS-6), inference.rs:21-43. w[20] = decay (FSRS6_DEFAULT_DECAY).
const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
] as const;

// clamps — simulation.rs:47-50
const S_MIN = 0.001, S_MAX = 36500, D_MIN = 1, D_MAX = 10;
const DAY_MS = 86_400_000;
const DEFAULT_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 36500;

const DECAY = -W[20];
const FACTOR = Math.exp(Math.log(0.9) / DECAY) - 1;
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

// R(t,S) — model.rs:173-178
export const retrievability = (elapsedDays: number, stability: number) =>
  Math.pow((elapsedDays / stability) * FACTOR + 1, DECAY);

// interval = f(S, retention) — model.rs:180-185
const intervalForStability = (stability: number, retention: number) =>
  (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);

const initStability = (g: Grade) => W[clamp(g - 1, 0, 3)]; // model.rs:187-190
const initDifficulty = (g: number) => W[4] - Math.exp(W[5] * (g - 1)) + 1; // model.rs:192-195
const linearDamping = (dD: number, oldD: number) => ((10 - oldD) * dD) / 9; // model.rs:202-205
const nextDifficulty = (d: number, g: Grade) => d + linearDamping(-W[6] * (g - 3), d); // model.rs:207-211
const meanReversion = (newD: number) => W[7] * (initDifficulty(4) - newD) + newD; // model.rs:197-200 (D0(4) unclamped, on purpose)

// SInc on recall — model.rs:213-225
const sAfterSuccess = (s: number, d: number, r: number, g: Grade) => {
  const hardPenalty = g === 2 ? W[15] : 1;
  const easyBonus = g === 4 ? W[16] : 1;
  return s * (Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus + 1);
};
// stability after lapse — model.rs:227-235
const sAfterFailure = (s: number, d: number, r: number) => {
  const newS = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
  return Math.min(newS, s / Math.exp(W[17] * W[18]));
};
// same-day review — model.rs:237-241
const sShortTerm = (s: number, g: Grade) => {
  const sinc = Math.exp(W[17] * (g - 3 + W[18])) * Math.pow(s, -W[19]);
  return s * (g >= 2 ? Math.max(sinc, 1) : sinc);
};

/** A brand-new, never-reviewed skill: due immediately. */
export function init(now: number = Date.now()): SkillMemory {
  return { difficulty: 0, stability: 0, lastReviewed: null, dueAt: now };
}

/** Apply one review. Mirrors fsrs-rs step() + next_states(). */
export function review(
  state: SkillMemory,
  grade: Grade,
  now: number = Date.now(),
  retention: number = DEFAULT_RETENTION,
): SkillMemory {
  let s: number, d: number;

  if (state.stability === 0 || state.lastReviewed === null) {
    // first review — init path (model.rs:265-269)
    s = initStability(grade);
    d = initDifficulty(grade);
  } else {
    const elapsedDays = (now - state.lastReviewed) / DAY_MS;
    const r = retrievability(elapsedDays, state.stability);
    if (elapsedDays === 0) s = sShortTerm(state.stability, grade);
    else s = grade === 1 ? sAfterFailure(state.stability, state.difficulty, r)
                         : sAfterSuccess(state.stability, state.difficulty, r, grade);
    d = meanReversion(nextDifficulty(state.difficulty, grade));
  }

  s = clamp(s, S_MIN, S_MAX);
  d = clamp(d, D_MIN, D_MAX);

  const intervalDays = clamp(Math.round(Math.max(intervalForStability(s, retention), 1)), 1, MAX_INTERVAL_DAYS);
  return { difficulty: d, stability: s, lastReviewed: now, dueAt: now + intervalDays * DAY_MS };
}

/** For the "reviews due" surface: lower = more urgent. */
export const currentRetrievability = (state: SkillMemory, now: number = Date.now()) =>
  state.lastReviewed === null ? 0 : retrievability((now - state.lastReviewed) / DAY_MS, state.stability);
