# Learner Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Every implementer subagent MUST load impeccable (product register) and follow `DESIGN.md`. Spec: `docs/superpowers/specs/2026-06-28-learner-home-design.md`.

**Goal:** Add a signed-in learner **Home** at `/` (a daily cockpit) and move the course map to `/courses`, surfacing Phase-3 learning-science + gamification signals with a daily-activity data layer.

**Architecture:** Additive Firestore data (daily-activity subcollection, daily goal, achievements, weekly league) accrued at the existing chokepoints in `lib/learner.tsx`; pure deterministic logic in `lib/learning/*`; a new `HomeScreen` composing new + existing `components/home` + `components/gamification` + `components/review` pieces, all on the existing dark design system.

**Tech Stack:** React 19 + TypeScript, TanStack Router, Firebase Firestore, Tailwind v4, Outfit. **No test runner in the app** — verification gates are `pnpm build` (tsc) + `pnpm lint`, plus manual checks with the DEV tools (`devCompleteAllLessons`, `devMakeReviewsDue`) and impeccable-swarm UI-QA.

**Per-task verification (standard):** unless noted, each task ends with:
```bash
pnpm build && pnpm lint   # both must be clean
```
and a `git add <changed files> && git commit -m "<msg>"`.

---

## File Structure

**Create**
- `src/lib/learning/activity.ts` — `DailyActivity` type, XP constants, pure aggregation helpers.
- `src/lib/learning/achievements.ts` — achievement catalog + predicates (pure).
- `src/lib/learning/league.ts` — deterministic weekly cohort + geometry tiers (pure).
- `src/routes/HomeScreen.tsx` — the Home page (assembles sections).
- `src/components/home/daily-goal-ring.tsx`
- `src/components/home/home-hero.tsx`
- `src/components/home/stat-strip.tsx`
- `src/components/home/memory-strength-card.tsx`
- `src/components/home/activity-heatmap.tsx`
- `src/components/home/league-section.tsx`
- `src/components/home/achievements-shelf.tsx`
- `src/components/home/achievement-medal.tsx`
- `src/components/home/course-peek-card.tsx`
- `src/components/home/index.ts` — barrel (extend existing if present).

**Modify**
- `src/lib/date.ts` — add `weekStart`, `lastNDays`, `daysLeftInWeek`.
- `src/lib/learner.tsx` — activity state + writes; `dailyGoalXp` get/set; achievements reconcile + selectors; league/activity selectors.
- `src/router.tsx` — add `/courses` route; point `/` at `HomeScreen`.
- `src/components/chrome/app-header.tsx` — fix Home/Courses tab targets + active states.
- `src/routes/LessonPlayer.tsx`, `src/routes/ReviewSession.tsx`, `src/routes/InfinitePractice.tsx` — repoint "back to map" → `/courses`.
- `src/lib/ai/tools/use-tool-context.ts`, `src/lib/ai/tools/navigation.ts` — Koji "course-map" → `/courses`.

---

## Task 1: Date/week helpers

**Files:** Modify `src/lib/date.ts`

- [ ] **Step 1: Add week helpers** (append to the file):

```ts
/** Monday-based start of the week containing `d`, as YYYY-MM-DD. */
export function weekStart(d: Date = new Date()): string {
  const x = new Date(d);
  const dayFromMonday = (x.getDay() + 6) % 7; // Sun=6 … Mon=0
  x.setDate(x.getDate() - dayFromMonday);
  return dateStr(x);
}

/** The last `n` local dates (oldest first), inclusive of today. */
export function lastNDays(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(dateStr(d));
  }
  return out;
}

/** Whole days remaining until the week rolls over (Sun → 0). */
export function daysLeftInWeek(d: Date = new Date()): number {
  return 6 - ((d.getDay() + 6) % 7);
}
```

- [ ] **Step 2:** `pnpm build && pnpm lint` clean.
- [ ] **Step 3:** Commit: `feat(home): add week/date helpers`.

---

## Task 2: Activity-log logic module

**Files:** Create `src/lib/learning/activity.ts`

- [ ] **Step 1: Write the module:**

```ts
/**
 * Daily activity log (Phase 3): one doc per local day at
 * users/{uid}/activity/{YYYY-MM-DD}. Powers the daily-goal ring, weekly strip,
 * heatmap, and weekly-league XP. Written at the existing accrual chokepoints.
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

export const DEFAULT_DAILY_GOAL_XP = 30;

export function emptyActivity(date: string): DailyActivity {
  return { date, xp: 0, lessonsCompleted: 0, problemsSolved: 0, reviewsDone: 0 };
}

/** Sum a field across a set of daily docs. */
export function sumField(days: DailyActivity[], key: keyof Omit<DailyActivity, "date">): number {
  return days.reduce((s, d) => s + (d[key] || 0), 0);
}
```

- [ ] **Step 2:** `pnpm build && pnpm lint` clean.
- [ ] **Step 3:** Commit: `feat(home): activity-log types + xp constants`.

---

## Task 3: Wire activity + daily goal into the learner store

**Files:** Modify `src/lib/learner.tsx`

Context: the store already subscribes to `users/{uid}`, `.../progress`, `.../skillMastery` and writes via `completeLesson`, `recordStep`, `recordReview`. Add a parallel activity subscription + writes, plus `dailyGoalXp`.

- [ ] **Step 1: Imports** — add to the firestore import and content/date imports:

```ts
// add to existing "firebase/firestore" import: (collection, onSnapshot already present)
// add: query is not needed (subscribe to whole subcollection at this scale)
import { DEFAULT_DAILY_GOAL_XP, REVIEW_XP, emptyActivity, type DailyActivity } from "./learning/activity";
import { today, yesterday, weekStart, lastNDays } from "./date"; // extend existing date import
```

- [ ] **Step 2: Profile field** — extend `LearnerProfile` with `dailyGoalXp: number;` and read it in the user `onSnapshot` with `dailyGoalXp: asNum(d.dailyGoalXp, DEFAULT_DAILY_GOAL_XP)`.

- [ ] **Step 3: Activity state + subscription** — add state `const [activity, setActivity] = useState<Record<string, DailyActivity>>({});` and, inside the `uid` effect, subscribe:

```ts
const activityCol = collection(db, "users", uid, "activity");
const unsubActivity = onSnapshot(activityCol, (snap) => {
  const map: Record<string, DailyActivity> = {};
  snap.forEach((docSnap) => {
    const d = docSnap.data() as Record<string, unknown>;
    map[docSnap.id] = {
      date: docSnap.id,
      xp: asNum(d.xp),
      lessonsCompleted: asNum(d.lessonsCompleted),
      problemsSolved: asNum(d.problemsSolved),
      reviewsDone: asNum(d.reviewsDone),
    };
  });
  setActivity(map);
});
// add unsubActivity() to the effect cleanup
```

- [ ] **Step 4: Activity write helper** — add near `markActiveToday`:

```ts
const bumpActivity = useCallback(
  async (patch: Partial<Pick<DailyActivity, "xp" | "lessonsCompleted" | "problemsSolved" | "reviewsDone">>) => {
    if (!uid) return;
    const t = today();
    await setDoc(
      doc(db, "users", uid, "activity", t),
      {
        date: t,
        ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, increment(v as number)])),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
  [uid],
);
```

- [ ] **Step 5: Hook the chokepoints**
  - In `completeLesson`, after the totalXp write: `await bumpActivity({ xp: xpEarned, lessonsCompleted: 1 });`
  - In `recordStep`, when the step is a problem (it always records a step result), add: `await bumpActivity({ problemsSolved: 1 });`
  - In `recordReview`, add: `await bumpActivity({ reviewsDone: 1, xp: REVIEW_XP });` and also grant the XP to the profile: `await setDoc(doc(db, "users", uid), { totalXp: increment(REVIEW_XP) }, { merge: true });`
  - Add `bumpActivity` to each callback's dep array.

- [ ] **Step 6: Selectors + setter** — add to the derived selectors and the context value:

```ts
function todayActivity(): DailyActivity {
  return activity[today()] ?? emptyActivity(today());
}
function weekActivity(): DailyActivity[] {
  return lastNDays(7).map((d) => activity[d] ?? emptyActivity(d));
}
function weeklyXp(): number {
  const start = weekStart();
  return Object.values(activity)
    .filter((a) => a.date >= start)
    .reduce((s, a) => s + a.xp, 0);
}
function activityFor(dates: string[]): DailyActivity[] {
  return dates.map((d) => activity[d] ?? emptyActivity(d));
}
const setDailyGoal = useCallback(async (xp: number) => {
  if (!uid) return;
  await setDoc(doc(db, "users", uid), { dailyGoalXp: xp, updatedAt: serverTimestamp() }, { merge: true });
}, [uid]);
```
Expose `todayActivity`, `weekActivity`, `weeklyXp`, `activityFor`, `setDailyGoal` on `LearnerContextValue` (add to the interface + the `value` object). Gate `loading` on a new `activityLoaded` flag the same way as the others.

- [ ] **Step 7:** `pnpm build && pnpm lint` clean.
- [ ] **Step 8:** Commit: `feat(home): daily-activity log + daily goal in learner store`.

---

## Task 4: Achievements catalog (pure)

**Files:** Create `src/lib/learning/achievements.ts`

- [ ] **Step 1: Write the module:**

```ts
/** Deterministic achievement catalog (Phase 3). Predicates over a facts snapshot
 *  built in the learner store; unlock timestamps are persisted separately. */
export type AchievementTier = "bronze" | "silver" | "gold";

export interface AchievementFacts {
  currentStreak: number;
  totalXp: number;
  hasCompletedLesson: boolean;
  hasPerfectLesson: boolean; // a completed lesson with every problem first-try
  masteredCount: number;
  firstMastery: boolean;
  hadComeback: boolean; // a mastered skill that previously lapsed
  chapterComplete: boolean; // level-review completed
  reviewsDone: number; // cumulative across all days
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji medal art (placeholder; impeccable may refine)
  tier: AchievementTier;
  predicate: (f: AchievementFacts) => boolean;
}

export const achievements: readonly Achievement[] = [
  { id: "first-lesson", title: "First steps", description: "Finish your first lesson.", icon: "🎯", tier: "bronze", predicate: (f) => f.hasCompletedLesson },
  { id: "perfect-lesson", title: "Flawless", description: "Complete a lesson with every answer right first try.", icon: "✨", tier: "silver", predicate: (f) => f.hasPerfectLesson },
  { id: "streak-3", title: "Warming up", description: "Reach a 3-day streak.", icon: "🔥", tier: "bronze", predicate: (f) => f.currentStreak >= 3 },
  { id: "streak-7", title: "On a roll", description: "Reach a 7-day streak.", icon: "🔥", tier: "silver", predicate: (f) => f.currentStreak >= 7 },
  { id: "streak-14", title: "Unstoppable", description: "Reach a 14-day streak.", icon: "🔥", tier: "gold", predicate: (f) => f.currentStreak >= 14 },
  { id: "first-mastery", title: "It stuck", description: "Master a skill by surviving a spaced review.", icon: "🧠", tier: "silver", predicate: (f) => f.firstMastery },
  { id: "comeback", title: "Comeback", description: "Re-master a skill after a lapse.", icon: "↩️", tier: "silver", predicate: (f) => f.hadComeback },
  { id: "theorem-master", title: "Theorem master", description: "Master all the chapter's skills.", icon: "📐", tier: "gold", predicate: (f) => f.masteredCount >= 7 },
  { id: "chapter-complete", title: "Chapter complete", description: "Pass the Level Review.", icon: "🏆", tier: "gold", predicate: (f) => f.chapterComplete },
  { id: "scholar-100", title: "Scholar", description: "Earn 100 XP.", icon: "⭐", tier: "bronze", predicate: (f) => f.totalXp >= 100 },
  { id: "scholar-300", title: "Dedicated", description: "Earn 300 XP.", icon: "🌟", tier: "gold", predicate: (f) => f.totalXp >= 300 },
  { id: "reviewer-10", title: "Memory keeper", description: "Complete 10 reviews.", icon: "🔁", tier: "silver", predicate: (f) => f.reviewsDone >= 10 },
] as const;

export function unlockedIds(f: AchievementFacts): string[] {
  return achievements.filter((a) => a.predicate(f)).map((a) => a.id);
}

export function getAchievement(id: string): Achievement | undefined {
  return achievements.find((a) => a.id === id);
}
```

- [ ] **Step 2:** `pnpm build && pnpm lint` clean.
- [ ] **Step 3:** Commit: `feat(home): achievements catalog`.

---

## Task 5: Weekly-league logic (pure, deterministic)

**Files:** Create `src/lib/learning/league.ts`

- [ ] **Step 1: Write the module:**

```ts
/** Deterministic weekly league (Phase 3 gamification). A synthetic cohort seeded
 *  by (uid, weekStart) — stable for the week, accruing through it — blended with
 *  the learner's live weekly XP. Geometry-themed tiers. Swap-ready for a real board. */
export const LEAGUE_TIERS = [
  "Triangle", "Square", "Pentagon", "Hexagon",
  "Heptagon", "Octagon", "Nonagon", "Decagon",
] as const;

export const ADVANCE_COUNT = 5;
const COHORT_SIZE = 10; // 9 bots + you
const COHORT_NAMES = [
  "Priya", "Marcus", "Lena", "Diego", "Sam",
  "Noah", "Maya", "Ivan", "Zoe", "Omar", "Aria", "Leo", "Nina", "Theo",
];

export interface LeagueMember { name: string; xp: number; you?: boolean; }
export interface LeagueState {
  tierName: string;
  members: LeagueMember[]; // ranked desc; learner flagged `you`
  advanceCount: number;
  daysLeft: number;
}

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLeague(opts: {
  seed: string;            // `${uid}:${weekStart}`
  learnerName: string;
  learnerWeeklyXp: number;
  tier: number;            // 0-based; higher = stronger cohort
  dayOfWeek: number;       // 0 (Mon) … 6 (Sun) — fraction of week elapsed
  daysLeft: number;
}): LeagueState {
  const rnd = mulberry32(hashSeed(opts.seed));
  const tierBoost = 1 + opts.tier * 0.25;
  const elapsed = (opts.dayOfWeek + 1) / 7;
  const names = [...COHORT_NAMES].sort(() => rnd() - 0.5).slice(0, COHORT_SIZE - 1);
  const bots: LeagueMember[] = names.map((name) => {
    const weekTarget = Math.round((40 + rnd() * 140) * tierBoost); // 40–180 * boost
    const xp = Math.round(weekTarget * elapsed * (0.7 + rnd() * 0.6));
    return { name, xp: Math.max(0, xp) };
  });
  const me: LeagueMember = { name: opts.learnerName || "You", xp: opts.learnerWeeklyXp, you: true };
  const members = [...bots, me].sort((a, b) => b.xp - a.xp);
  const tierName = LEAGUE_TIERS[Math.min(opts.tier, LEAGUE_TIERS.length - 1)];
  return { tierName, members, advanceCount: ADVANCE_COUNT, daysLeft: opts.daysLeft };
}
```

- [ ] **Step 2:** `pnpm build && pnpm lint` clean.
- [ ] **Step 3:** Commit: `feat(home): deterministic weekly league`.

---

## Task 6: Achievements reconcile + league/facts selectors in the store

**Files:** Modify `src/lib/learner.tsx`

- [ ] **Step 1:** Subscribe to `users/{uid}/achievements` into `const [achievementsUnlocked, setAchievementsUnlocked] = useState<Record<string, number>>({})` (id → unlockedAt). Add cleanup.

- [ ] **Step 2: Facts builder** (derived):

```ts
function achievementFacts(): AchievementFacts {
  const completedLessons = lessonOrder.filter((id) => lessonStatus(id) === "completed");
  const hasPerfect = completedLessons.some((id) => {
    const lesson = getLesson(id); const p = progress[id];
    const total = lesson ? problemCount(lesson) : 0;
    if (!p || total === 0) return false;
    const firstTry = Object.values(p.steps).filter((s) => s.firstTryCorrect).length;
    return firstTry === total;
  });
  const m = levelMastery("level-1");
  const hadComeback = m.skills.some((s) => {
    const sm = skills[s.id];
    return sm?.masteryLevel === "mastered" && sm.lapses > 0;
  });
  const reviewsDone = Object.values(activity).reduce((s, a) => s + a.reviewsDone, 0);
  return {
    currentStreak: profile?.currentStreak ?? 0,
    totalXp: profile?.totalXp ?? 0,
    hasCompletedLesson: completedLessons.length > 0,
    hasPerfectLesson: hasPerfect,
    masteredCount: m.mastered,
    firstMastery: m.mastered >= 1,
    hadComeback,
    chapterComplete: lessonStatus("level-review") === "completed",
    reviewsDone,
  };
}
```

- [ ] **Step 3: Reconcile effect** — after data is loaded, persist new unlocks (idempotent: only write ids missing from `achievementsUnlocked`):

```ts
useEffect(() => {
  if (!uid || loading) return;
  const due = unlockedIds(achievementFacts()).filter((id) => !(id in achievementsUnlocked));
  if (due.length === 0) return;
  void Promise.all(
    due.map((id) =>
      setDoc(doc(db, "users", uid, "achievements", id), { unlockedAt: Date.now() }, { merge: true }),
    ),
  );
  // deps: uid, loading, profile, progress, skills, activity, achievementsUnlocked
}, [uid, loading, profile, progress, skills, activity, achievementsUnlocked]);
```

- [ ] **Step 4: Selectors** — expose `achievementFacts`, `unlockedAchievements(): Record<string, number>` (returns `achievementsUnlocked`), and a `leagueState(now)` selector:

```ts
function leagueState(now: number): LeagueState {
  const ws = weekStart(new Date(now));
  const tier = asNum((profile as unknown as Record<string, unknown>)?.leagueTier, 0);
  const d = new Date(now);
  return buildLeague({
    seed: `${uid ?? "anon"}:${ws}`,
    learnerName: profile?.displayName ?? "You",
    learnerWeeklyXp: weeklyXp(),
    tier,
    dayOfWeek: (d.getDay() + 6) % 7,
    daysLeft: daysLeftInWeek(d),
  });
}
```
(Import `unlockedIds`, `buildLeague`, `type LeagueState`, `daysLeftInWeek`. `leagueTier` is optional on the user doc; default 0. Tier promotion at week rollover is out of scope for v1 — note it; the synthetic board still reads correctly at tier 0.)

- [ ] **Step 5:** `pnpm build && pnpm lint` clean.
- [ ] **Step 6:** Commit: `feat(home): achievements reconcile + league selector`.

---

## Task 7: Route migration (`/` → Home, map → `/courses`)

**Files:** Modify `src/router.tsx`, `src/components/chrome/app-header.tsx`, `src/routes/LessonPlayer.tsx`, `src/routes/ReviewSession.tsx`, `src/routes/InfinitePractice.tsx`, `src/lib/ai/tools/use-tool-context.ts`, `src/lib/ai/tools/navigation.ts`. Create a temporary placeholder `src/routes/HomeScreen.tsx`.

- [ ] **Step 1: Placeholder HomeScreen** so routing compiles before Task 14:

```tsx
import { AppHeader } from "../components/chrome";
export function HomeScreen() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Home</h1>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: router.tsx** — import `HomeScreen`; change `courseMapRoute` path to `/courses`; add a new root `/` route rendering `HomeScreen` (auth-guarded with `requireAuth`); add it to `routeTree`. Keep the signed-in `/auth` redirect at `to: "/"`.

- [ ] **Step 3: app-header.tsx** — Home tab: `active: pathname === "/"`, `onPress: () => navigate({ to: "/" })`. Courses tab: `active: pathname === "/courses"`, `onPress: () => navigate({ to: "/courses" })`. Brand stays `→ "/"`.

- [ ] **Step 4: Repoint "back to map"** — in `LessonPlayer.tsx:117`, `InfinitePractice.tsx:44`, `ReviewSession.tsx:88`: change `to: "/"` → `to: "/courses"`.

- [ ] **Step 5: Koji nav** — `use-tool-context.ts:147` (`case "course-map"`) → `navigate({ to: "/courses" })`; `navigation.ts` `goToCourseMap` mapping → `/courses`.

- [ ] **Step 6: Verify** — `pnpm build && pnpm lint`; then `pnpm dev` and manually confirm: `/` shows Home placeholder; `/courses` shows the map; both tabs underline correctly; finishing a lesson / leaving a review / exiting practice returns to `/courses`; signed-in visiting `/auth` lands on `/`.
- [ ] **Step 7:** Commit: `feat(home): route Home at / and move course map to /courses`.

---

## Task 8: DailyGoalRing + HomeHero

**Files:** Create `src/components/home/daily-goal-ring.tsx`, `src/components/home/home-hero.tsx`

**DailyGoalRing contract:** props `{ current: number; goal: number; className? }`. An SVG ring (stroke-dashoffset fill) showing `current/goal` XP; center shows `current` (tabular-nums) + small "/ goal XP"; `accent` stroke filling to `success` when met; `aria-label="Daily goal: {current} of {goal} XP"`; honor `prefers-reduced-motion` (no fill transition when set). Brand: charcoal track, no gradient.

**HomeHero contract:** props `{ greeting: string; subtitle: string; recommendation: Recommendation; resume?: {index:number,total:number}; onPrimary: () => void; goalCurrent: number; goal: number; streak: number; }`. Layout: left = greeting (`text-2xl font-bold`) + subtitle (`text-muted`) + the next-action card (reuse `RecommendedCourseDeck` with `course=lesson.title`, `level="Level 1"`, `actionLabel` from `{start:"Start",continue:"Continue",review:"Review",done:"Review"}[kind]`, `nextLesson` = resume hint, `onStart=onPrimary`); right = `DailyGoalRing` + a streak bolt row. Stacks on mobile. Use the tactile primary/accent button (accent only for the recommended next step, per DESIGN.md).

- [ ] **Step 1:** Write both components to the contracts above (load impeccable for craft; match `DESIGN.md`).
- [ ] **Step 2:** `pnpm build && pnpm lint` clean.
- [ ] **Step 3:** Commit: `feat(home): daily-goal ring + hero`.

---

## Task 9: StatStrip

**Files:** Create `src/components/home/stat-strip.tsx`

**Contract:** props `{ streak:number; longest:number; weekXp:number; mastered:number; totalSkills:number; reviewsDue:number; }`. A responsive row of 4 stat tiles (Day streak with "best N" sub, This-week XP, Skills mastered `X/7`, Reviews due). Reuse the `Stat` visual pattern from `ProfileScreen` but framed for today/this-week. `tabular-nums`; optional count-up that respects `prefers-reduced-motion`. Each tile a flat surface card, hairline border, no hero-metric template (keep them equal, compact, glanceable — not one giant number).

- [ ] **Step 1:** Write it. **Step 2:** `pnpm build && pnpm lint`. **Step 3:** Commit: `feat(home): stat strip`.

---

## Task 10: MemoryStrengthCard

**Files:** Create `src/components/home/memory-strength-card.tsx`

**Contract:** no props (reads `useLearner`). For each skill in `skillsForLevel("level-1")` that has been started (`skillMastery(id)?.memory.lastReviewed !== null`), compute recall `= currentRetrievability(memory, now)` (live `now` via a 1s interval like `ReviewsCard`). Render a labeled bar per skill: label = `getSkill(id).label`, fill = recall%, color strong (`success`) ≥0.7 → fading (`warning`) 0.4–0.7 → faded (`muted`/`error`) <0.4; pair color with a small text % (never color-only). Tapping a skill → `onPractice(id)` → `/reviews?skill=`. Heading "Memory strength" with a tooltip ("How fresh each idea is — practice the faded ones."). If no skill started yet, render null (first-run). This view is the Phase-3 signature; make it crisp.

- [ ] **Step 1:** Write it. **Step 2:** `pnpm build && pnpm lint`. **Step 3:** Commit: `feat(home): memory-strength card`.

---

## Task 11: ActivityHeatmap + week strip wiring

**Files:** Create `src/components/home/activity-heatmap.tsx`

**Contract:** props `{ days: DailyActivity[] }` (caller passes `activityFor(lastNDays(42))`). Render a GitHub-style grid (6 weeks × 7), each cell tinted by intensity buckets of `xp` (0 = empty hairline, then 4 `accent` alpha steps); today outlined; `aria-label` per cell ("{date}: {xp} XP"). Also export/compose a small **week strip** using `gamification/StreakCard` shape from the last 7 days (state: `completed` if xp>0, `current` for today, else `upcoming`) — the HomeScreen will pass `weekActivity()`. Respect reduced motion (no cell animation).

- [ ] **Step 1:** Write it. **Step 2:** `pnpm build && pnpm lint`. **Step 3:** Commit: `feat(home): activity heatmap + week strip`.

---

## Task 12: LeagueSection

**Files:** Create `src/components/home/league-section.tsx`

**Contract:** reads `useLearner().leagueState(Date.now())` (live `now` via interval ok). Renders `gamification/LeagueCard` (variant `active`, `title={tierName + " LEAGUE"}`, `subtitle={"Top " + advanceCount + " advance · " + daysLeft + " days left"}`) wrapping `gamification/Leaderboard` with `entries` = members mapped to `{rank: i+1, name, xp, you}` and `advanceCount`. Provide a "View league" `Modal` (reuse `ui/Modal`) with the full board. Honesty: this is a motivational weekly league with a synthetic cohort — keep copy truthful ("This week's league"), no fake "live" claims.

- [ ] **Step 1:** Write it. **Step 2:** `pnpm build && pnpm lint`. **Step 3:** Commit: `feat(home): weekly league section`.

---

## Task 13: AchievementsShelf + AchievementMedal

**Files:** Create `src/components/home/achievement-medal.tsx`, `src/components/home/achievements-shelf.tsx`

**AchievementMedal contract:** props `{ achievement: Achievement; unlockedAt: number | null; isNew?: boolean }`. A medal chip: lit (tier-colored: bronze/silver/gold via existing tokens, icon + title) when unlocked, dim/grayscale + lock when not; "NEW" pip when `isNew`. Tap → opens detail (handled by shelf). Tier colors must use design tokens, not raw hex; no gradient text.

**AchievementsShelf contract:** reads `useLearner().unlockedAchievements()`; iterates `achievements`; computes `isNew = unlockedAt && Date.now()-unlockedAt < 24h`; header "Achievements" + "X of N"; responsive grid; tapping a medal opens a `ui/Modal` with title/description/tier and unlock date. Sort: unlocked-by-recency first, then locked.

- [ ] **Step 1:** Write both. **Step 2:** `pnpm build && pnpm lint`. **Step 3:** Commit: `feat(home): achievements shelf`.

---

## Task 14: CoursePeekCard

**Files:** Create `src/components/home/course-peek-card.tsx`

**Contract:** props `{ completedLessons:number; totalLessons:number; mastered:number; totalSkills:number; onOpen:()=>void }`. A compact card: course title (`course.title`), a slim progress bar (lessons), "X/7 skills mastered", and a "View course map" button → `onOpen` (`/courses`). Reuse `PythagorasArt` for the mark. Keeps Home a cockpit, not a duplicate map.

- [ ] **Step 1:** Write it. **Step 2:** `pnpm build && pnpm lint`. **Step 3:** Commit: `feat(home): course peek card`.

---

## Task 15: Assemble HomeScreen (states + AI-off)

**Files:** Modify `src/routes/HomeScreen.tsx` (replace placeholder); modify `src/components/home/index.ts` (barrel exports).

- [ ] **Step 1: Compose** all sections in order from the spec:
  1. `HomeHero` (greeting from time-of-day + `profile.displayName`; subtitle derived from streak/recommendation; `recommendation()`; `resumeIndex`; primary → `requestLessonIntro(lessonId)` then `navigate({to:"/lesson/$lessonId"})`; goal from `todayActivity().xp` / `profile.dailyGoalXp`; streak).
  2. `StatStrip` (streak/longest from `useStreak`; `weekXp=weeklyXp()`; mastered from `levelMastery("level-1")`; reviewsDue from `dueReviews(Date.now()).length`).
  3. Learning-science row (2-col): `ReviewsCard` (onStart→`/reviews`) + `MemoryStrengthCard` (onPractice→`/reviews?skill=`).
  4. `ActivityHeatmap` + week strip (`activityFor(lastNDays(42))`, `weekActivity()`).
  5. `LeagueSection`.
  6. `AchievementsShelf`.
  7. `CoursePeekCard` (→ `/courses`).
  8. Koji nudge only if `aiEnabled()`.

- [ ] **Step 2: Loading** — while `useLearner().loading`, render section skeletons (reuse existing skeleton/`animate-pulse` patterns).

- [ ] **Step 3: First-run** — with no progress/skills: hero shows "Start your first lesson" (recommendation already returns lesson 1); `MemoryStrengthCard` + `ReviewsCard` self-hide (null) until skills scheduled; stats show zeros; league + achievements still render (cohort + all-locked). Verify nothing throws on empty data.

- [ ] **Step 4: Responsive** — single column on mobile; 2-col where noted at `md`; container `max-w-5xl`. No layout-property animations.

- [ ] **Step 5: Verify** — `pnpm build && pnpm lint`; `pnpm dev` and check all three states using DEV tools on `/courses` (`devCompleteAllLessons`, then `devMakeReviewsDue`) then return to `/`; toggle `VITE_AI_ENABLED` to confirm the Koji nudge hides AND the rest is intact.
- [ ] **Step 6:** Commit: `feat(home): assemble learner Home dashboard`.

---

## Task 16: Final verification pass

- [ ] **Step 1:** `pnpm build && pnpm lint` clean from a fresh state.
- [ ] **Step 2:** Manual matrix — {fresh, mid-chapter, all-complete} × {AI on, AI off}; confirm route integrity (every "back" → `/courses`, tab active states, refresh on `/` and `/courses`).
- [ ] **Step 3:** Confirm no `Date.now()`-in-render warnings beyond the intended live-`now` intervals; confirm reduced-motion paths.
- [ ] **Step 4:** Commit any fixups. Hand off to **impeccable-swarm** for UI-QA.

---

## Self-Review

**Spec coverage:** routing (T7) ✓ · activity log (T2,T3) ✓ · daily goal (T3,T8) ✓ · achievements (T4,T6,T13) ✓ · league (T5,T6,T12) ✓ · hero/next-action (T8) ✓ · stats (T9) ✓ · memory strength (T10) ✓ · spaced review reuse (T15) ✓ · weekly activity/heatmap (T11) ✓ · course peek (T14) ✓ · Koji nudge + AI-off (T15) ✓ · states (T15) ✓ · verification + swarm (T16) ✓. Premium intentionally excluded.

**Placeholder scan:** logic modules (T1,T2,T4,T5) and store wiring (T3,T6) carry complete code; UI tasks (T8–T15) carry explicit contracts (props, data sources, states, brand constraints) for impeccable-guided implementers rather than full markup, by design for a craft-heavy feature.

**Type consistency:** `DailyActivity`, `AchievementFacts`, `Achievement`, `LeagueState`, `LeagueMember` are defined once and consumed by name; selector names (`todayActivity`, `weekActivity`, `weeklyXp`, `activityFor`, `leagueState`, `unlockedAchievements`, `achievementFacts`, `setDailyGoal`) are consistent between the store (T3,T6) and the consumers (T8–T15). `REVIEW_XP`/`DEFAULT_DAILY_GOAL_XP` from `activity.ts`. `LEAGUE_TIERS`/`ADVANCE_COUNT`/`buildLeague` from `league.ts`.

**Open items:** league tier promotion at week rollover is deferred (v1 reads at the stored tier, default 0). Bounded activity query (last N days) is a future optimization; v1 subscribes to the whole subcollection (small at this scale).

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-06-28-learner-home.md`. Execution: **subagent-driven-development** (fresh implementer subagent per task + spec-compliance then code-quality review subagents), every implementer building to impeccable's product-register laws; then **impeccable-swarm** for UI-QA.
