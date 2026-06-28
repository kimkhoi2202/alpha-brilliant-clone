# Learner Home — Design Spec

> Status: approved (design), pending spec review · Phase 3 (learning-science) · Branch `phase-3/learning-science`
> Date: 2026-06-28

## 1. Context & goal

AlphaBrilliant teaches one chapter deeply (Geometry → the Pythagorean Theorem) to a
high-school learner. Phase 3 layers learning science on the working app: FSRS spaced
repetition, retrieval practice, and durable mastery (mastery = surviving a *due* spaced
review, not a one-time pass).

Today the signed-in surface is the **Courses** map (`CourseMapScreen` at `/`). The nav
has a **Home** tab, but it points at `/` too — a real learner Home does not exist yet.
This spec defines that Home: a **daily cockpit** that answers "what do I do right now?"
at a glance and drives the return-habit loop, surfacing Phase-3 signals (especially
per-skill memory strength) that exist in data but are shown nowhere.

**Success:** a learner lands on Home and within one glance knows (a) the single best next
action, (b) whether their streak/daily goal is safe, (c) what needs reviewing before it
fades, and (d) how close they are to mastering the chapter — and is pulled back daily.

## 2. Non-goals

- No new course content or lessons; the chapter is unchanged.
- No premium/monetization surface on Home (explicit decision).
- No multi-course catalog (the app is single-chapter; the showcase catalog is aspirational).
- Does not replace Courses; Home links to the full map rather than duplicating it.
- No backend/business-logic rewrites beyond the additive data below.

## 3. Routing changes (`home_at_root`)

| Route | Before | After |
|---|---|---|
| `/` | `CourseMapScreen` | **`HomeScreen`** (new), auth-guarded |
| `/courses` | — | `CourseMapScreen` (moved), auth-guarded |
| `/landing` | marketing Landing | unchanged |
| `/auth` | redirects signed-in → `/` | unchanged (→ `/` = Home, good) |

**Blast radius (audited, 8 sites):**
- `components/chrome/app-header.tsx`: Home tab → `/` (active on `/`); Courses tab → `/courses`
  (active on `/courses`); Brand → `/` (Home).
- "Back to the course map" jumps repoint to `/courses`:
  `routes/LessonPlayer.tsx` (`goToCourse`), `routes/ReviewSession.tsx` (`back`),
  `routes/InfinitePractice.tsx` (`goToCourse`).
- Koji navigation: `lib/ai/tools/use-tool-context.ts` `case "course-map"` → `/courses`;
  `lib/ai/tools/navigation.ts` `goToCourseMap` mapping → `/courses`.
- `router.tsx`: signed-in `/auth` redirect stays `→ /` (Home).

Acceptance: every former "return to map" path lands on `/courses`; both nav tabs show the
correct active underline; a hard refresh on `/courses` mid-state restores correctly
(reuse the existing `requireAuth` guard behavior).

## 4. Data model additions (Firestore, additive)

All writes hang off the **existing chokepoints** in `lib/learner.tsx`
(`completeLesson`, `recordStep`, `recordReview`) so there is one accrual path.

### 4.1 Daily activity log
`users/{uid}/activity/{YYYY-MM-DD}` (doc id = local date via `lib/date.ts today()`):
```
{ date: string, xp: number, lessonsCompleted: number,
  problemsSolved: number, reviewsDone: number, updatedAt }
```
- Written (merge + `increment`) alongside existing writes:
  - `completeLesson` → `xp += xpEarned`, `lessonsCompleted += 1`.
  - `recordStep` (problem) → `problemsSolved += 1`, `xp += PROBLEM_XP` *(new, small)*.
  - `recordReview` → `reviewsDone += 1`, `xp += REVIEW_XP` *(new, small)*.
- Powers: daily-goal ring (today's doc), weekly strip (last 7 docs), heatmap (last ~42
  docs), weekly-league XP (sum of this week's docs).

> Decision: reviews/practice now grant small XP (defaults `REVIEW_XP=5`, `PROBLEM_XP=2`,
> tunable) so the daily goal is reachable without a full lesson. This also flows into
> `totalXp` for consistency. Lesson XP (`lessonXp`) is unchanged.

### 4.2 Daily goal
`users/{uid}.dailyGoalXp: number` (default **30** ≈ one lesson). Editable via a small
picker (e.g., 20 / 30 / 50). Read with a fallback default so legacy users work.

### 4.3 Achievements
Deterministic catalog (predicates over existing learner state). Persist only the unlock
moment: `users/{uid}/achievements/{achievementId}.unlockedAt: number`. A reconcile pass
(on Home mount / after each accrual) checks predicates and writes any newly-true unlock,
enabling "NEW" badges + recency sort. Catalog (id · title · predicate):
- `first-lesson` — first lesson completed.
- `streak-3` / `streak-7` / `streak-14` / `streak-30` — `currentStreak >=` n.
- `perfect-lesson` — a completed lesson with every problem `firstTryCorrect`.
- `first-mastery` — any skill reaches `mastered` (survived a review).
- `theorem-master` — all 7 skills `mastered`.
- `chapter-complete` — `level-review` completed.
- `scholar-100` / `scholar-300` — `totalXp >=` n.
- `comeback` — a skill returns to `mastered` after a lapse (`lapses > 0 && mastered`).
- `reviewer-10` — cumulative `reviewsDone >= 10` (from activity log).

Each achievement has `tier: bronze|silver|gold` and an icon for the medal shelf.

### 4.4 Weekly league (synthetic cohort)
`users/{uid}.league = { tier: number, weekStart: string }`.
- `weekStart` = Monday of the current week (helper in `lib/date.ts`).
- Weekly XP (learner) = sum of activity-log `xp` for the current week.
- **Cohort**: deterministically generated from a seed (`uid + weekStart`) → stable for the
  week: ~9 named competitors with avatars and a per-day XP curve so the board "moves"
  through the week. Learner is blended in by live weekly XP and flagged `you`.
- Tiers are **geometry-themed**, climbing on a weekly top-N finish:
  Triangle → Square → Pentagon → Hexagon → Heptagon → Octagon → Nonagon → Decagon.
- Top N advance / bottom N demote (cosmetic tier change at week rollover).

> Honesty note: the league is the only non-real-data feature (solo, single-chapter app).
> It is framed as a motivational weekly league. Architected behind a `lib/learning/league.ts`
> seam so a real global board can replace the synthetic cohort later without UI changes.

## 5. Home page (`routes/HomeScreen.tsx`)

Container mirrors existing screens: `min-h-svh bg-background text-foreground`, `AppHeader`,
centered `max-w-5xl` main. Sections top → bottom (single column on mobile, 2-col where noted):

1. **Hero "Today"**
   - Greeting (time-of-day + `displayName`) and a one-line momentum subtitle derived from
     state ("On a 3-day streak — one lesson keeps it alive" / "Welcome back" / first-run
     "Let's start the chapter").
   - **Next-action CTA** from `recommendation()` → Continue / Start / Review with lesson
     title, a thin resume bar (`resumeIndex` / steps), and a tactile accent button that
     deep-links to `/lesson/$lessonId` (reuse the branded lesson intro via
     `requestLessonIntro`). Reuse/extend `components/home/RecommendedCourseDeck`.
   - **Daily-goal ring**: today's xp / `dailyGoalXp`, with streak bolt + "active today" check.
   - Data: `recommendation`, `resumeIndex`, profile, today's activity. `[live + activity log]`

2. **At-a-glance stats** (compact row, count-up, `tabular-nums`)
   - Day streak (longest as sub) · This-week XP · Skills mastered (X/7) · Reviews due.
   - Distinct from Profile's static tiles by being "today/this week" framed.

3. **Learning-science row** (2-col on desktop)
   - **Spaced review** — reuse `ReviewsCard` (due count / "all caught up, next in X"),
     start → `/reviews`.
   - **Memory strength** *(new)* — per-skill recall % from `currentRetrievability(memory, now)`
     as labeled bars, colored strong (green) → fading (gold) → faded (muted/red); tap a
     weak skill → `/reviews?skill=`. The signature Phase-3 view (computed, shown nowhere today).

4. **Weekly activity**
   - 7-day strip (reuse `gamification/StreakCard` shape: completed / today / upcoming),
     plus a small consistency **heatmap** (last ~6 weeks) from the activity log.

5. **League** — reuse `gamification/LeagueCard` + `Leaderboard`: weekly board, `you`
   highlighted, top-N advance, days-left; geometry tier name. Opens a detail modal.

6. **Achievements** — medal shelf: unlocked (lit) vs locked (dim), "NEW" on fresh unlocks,
   "X of N", tap → detail modal. New `components/home` (or `gamification`) pieces.

7. **Course peek** — compact card → `/courses` (keeps Home a cockpit, not a second map).

8. **Koji nudge** — AI-on only (`aiEnabled()`), a subtle "Ask Koji" entry. Hidden AI-off.

### States (every section)
- **Loading**: skeletons while `useLearner().loading` / `progressLoaded` hydrate.
- **First-run (no data)**: hero = "Start your first lesson"; goal ring 0/30; stats zeroed;
  memory/review cards hidden until skills are scheduled (mirror `ReviewsCard`'s null-guard);
  mastery 0/7; league shows you + cohort; achievements all locked with the first teased.
- **AI-off**: Koji nudge + practice promo hidden; everything else fully functional.

## 6. Component inventory

**Reuse (exist):** `chrome/AppHeader`, `home/RecommendedCourseDeck`, `home/PremiumUpsellCard`
(not used here), `gamification/StreakCard`, `gamification/LeagueCard`, `gamification/Leaderboard`,
`review/ReviewsCard`, `review/SkillMasteryPanel`, `ui/*` (Button, ProgressBar, Modal, Avatar,
Tooltip, Counter, Chip, Badge, Divider).

**New:**
- `routes/HomeScreen.tsx` (+ `/courses` route wiring in `router.tsx`).
- `components/home/daily-goal-ring.tsx`, `home/home-hero.tsx`, `home/stat-strip.tsx`,
  `home/memory-strength-card.tsx`, `home/activity-heatmap.tsx`, `home/achievements-shelf.tsx`,
  `home/achievement-medal.tsx`, `home/league-section.tsx` (wraps existing league components
  with live data), `home/course-peek-card.tsx`.
- `lib/learning/achievements.ts` (catalog + predicates), `lib/learning/league.ts`
  (seeded cohort + tiers), `lib/learning/activity.ts` (read/write helpers + week math).
- `lib/learner.tsx` additions: activity writes, `dailyGoalXp` get/set, achievement reconcile,
  selectors (`todayActivity`, `weekActivity(now)`, `weeklyXp(now)`, `unlockedAchievements`).
- `lib/date.ts` additions: `weekStart`, `lastNDays`.

## 7. Brand & quality constraints (from DESIGN.md)

Charcoal `#141414` canvas (never `#000`); Outfit only (weight/size hierarchy); meaningful
color only (blue = brand/next-step, pear = streak, green/gold/red = status); tactile
"clicky" CTAs with the 3D lip; flat surfaces with hairline borders + tonal steps; cards ≤
`rounded-2xl`; `tabular-nums` for all numbers/meters. **Bans:** no hero-metric template, no
gradient text, no side-stripe borders, no glassmorphism default, no second typeface/new hue,
no modal-as-first-thought (modals only for league/achievement detail). Every animation has a
`prefers-reduced-motion` fallback; feedback never relies on color alone (pair with icon/label).

## 8. Accessibility

Readable contrast on dark; `prefers-reduced-motion` honored on the goal ring fill, count-ups,
heatmap, and any league/medal motion; keyboard-reachable cards/buttons with visible focus;
recall/mastery colors paired with text labels; meaningful `aria-label`s on meters and the ring.

## 9. Verification

- `pnpm build` and `pnpm lint` clean (the Phase-2 snapshot bar).
- Manual: brand-new account (empty states), mid-chapter account, all-complete account
  (use existing DEV tools `devCompleteAllLessons` + `devMakeReviewsDue`).
- Route migration: every "back to map" lands on `/courses`; tabs' active states correct;
  refresh integrity on `/` and `/courses`.
- AI-off: Home renders fully; Koji nudge + practice promo hidden.
- `impeccable-swarm` UI-QA passes the world-class bar (critique ≥ 32/40, audit ≥ 16/20,
  AI-slop = pass, zero P0/P1).

## 10. Build pipeline (subagent-driven)

1. `writing-plans` → task-by-task implementation plan (data layer → routing → components →
   HomeScreen assembly → states/AI-off → polish).
2. `subagent-driven-development` → fresh implementer subagent per task; spec-compliance then
   code-quality review subagents gate each; built to `impeccable` (product register) laws.
3. `impeccable-swarm` → parallel UI-QA subagents in a fix → re-verify loop to the bar above.
4. `finishing-a-development-branch` → integrate.

## 11. Risks / open items

- **League authenticity** — synthetic cohort; mitigated by framing + a swap-ready seam.
- **XP semantics change** — reviews/practice now grant XP (intended; flows to `totalXp`).
- **Read volume** — activity heatmap reads ~42 daily docs; acceptable (small docs, cached
  by the live snapshot pattern); revisit if it grows.
- **Scope vs deadline** — Phase 3 is due today; sections are independent, so the swarm can
  parallelize, and lower-priority sections (heatmap, league) can land last without blocking
  the core hero + learning-science value.
