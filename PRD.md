# Product Requirements Document — AlphaBrilliant

> A learn-by-doing geometry app that teaches the **Pythagorean Theorem** through hands-on, interactive problems — modeled on Brilliant, built deep for one chapter.

| Field | Value |
| --- | --- |
| Document owner | Khoi |
| Status | Draft `v0.1` |
| Last updated | 2026-06-22 |
| Target | MVP (Phase 1) |
| Platform | Responsive web (mobile-first) |
| Tech stack | React + TypeScript + Vite + Firebase |
| Subject | Geometry → the Pythagorean Theorem |

**Contents:** [1. MVP](#1-mvp) · [2. User Profile](#2-user-profile) · [3. User Story](#3-user-story) · [4. Tech Stack](#4-tech-stack)

---

## 1. MVP

### 1.1 Overview

AlphaBrilliant is a learn-by-doing web app modeled on Brilliant. Instead of going wide across many topics, it goes **deep on a single chapter of geometry: the Pythagorean Theorem**. The whole product is built for one persona — a high-school student (9th/10th grade) meeting right triangles for real.

The core loop is the opposite of "watch a video, take a quiz." Every lesson drops the learner straight into an interactive problem: they **drag a triangle, plot points on a grid, or rearrange a proof**, get **instant, specific feedback**, and only then is the idea named. They play with the concept until it clicks.

The MVP is a short course — **five lessons plus a mixed review** — wrapped in a course path with mastery tracking, streaks, persistent progress, and accounts. **No AI is used anywhere in the MVP**; every problem, visual, and feedback line is hand-built so the core experience stands on its own.

### 1.2 Problem Statement

Passive content does not stick, and geometry is where this hurts most. Students "watch" the Pythagorean theorem explained, memorize `a² + b² = c²`, and still freeze the moment a problem looks unfamiliar — because they never built the underlying intuition by *doing*.

Existing options fall into two traps: video-first apps (you watch someone else solve it) and quiz apps (shallow multiple-choice trivia that tests recall, not understanding). Neither lets a learner **touch a right triangle, get it wrong, and figure it out**.

**Problem:** high-school students need to *build* an intuition for the Pythagorean theorem through hands-on manipulation and instant feedback — but the tools they have either lecture at them or quiz them, and do neither deeply.

### 1.3 Goals & Non-Goals

**Goals (MVP)**
- Teach the Pythagorean theorem through **interactive, hands-on problems**, not video or walls of text.
- Ship **at least one rich problem type beyond multiple choice** (drag, plot, slider, rearrange) per the chapter.
- Provide a **visual element the learner manipulates** and watches respond (a right triangle, squares on the sides, a coordinate grid, a draggable proof).
- Give **instant (< 100ms), specific, hand-written feedback** on every answer — wrong answers get a targeted hint or explanation, not just a red X.
- **Persist progress**: leave mid-lesson, return on any device, pick up exactly where you stopped.
- Provide a **course path with mastery tracking** that unlocks/recommends a sensible next step.
- Add a **habit loop**: streaks, milestones, and a satisfying lesson-complete moment.
- **Accounts with names** (email/password + Google).
- **Mobile-first**, touch-friendly, 60fps visuals, < 2s to first interaction.
- **Deployed, public** on Firebase Hosting.
- The whole thing **teaches with zero AI**.

**Non-Goals (explicitly out of scope for the MVP)**
- Any AI: problem generation, hints, adaptive paths, chat tutor (→ Phase 2).
- Formal learning-science systems: spaced-repetition scheduler, interleaving engine (→ Phase 3). Immediate explanatory feedback is in scope; the rest is not.
- Additional chapters or subjects beyond the Pythagorean theorem.
- A content-authoring / admin UI (lessons are authored in code).
- Social features, leaderboards, sharing.
- Push notifications and full offline PWA support.

> Full exclusions are detailed in [1.7 Out of Scope](#17-out-of-scope).

### 1.4 Core Features

#### 1.4.1 Accounts & Profile (Auth)
- Sign up / sign in with **email + password** and **Google** (Firebase Authentication).
- Capture a **display name** (from the form, or from the Google profile) so learners have names.
- On first sign-in, create a `users/{uid}` profile document (name, email, streak fields, milestones).
- Persistent sessions; the app routes signed-out users to sign-in and signed-in users to the course.

#### 1.4.2 Course Path & Map
- A Brilliant-style **course map** showing the chapter as an ordered path of lesson nodes.
- Each node shows its **state**: locked, available, in-progress, completed, or mastered.
- Lessons **unlock sequentially** as the learner masters the previous one.
- The map surfaces a clear **"continue / next step" recommendation**, and resurfaces a **review** when a concept was missed repeatedly.
- The map header shows the **current streak** and overall progress.

#### 1.4.3 Interactive Lessons (content-model driven)
- A lesson is a short (a few minutes) **ordered sequence of steps**, defined by a **content model** (structured data), not hard-coded HTML.
- Two step kinds: **concept** (a brief idea, often with a visual) and **problem** (something the learner does).
- The chapter ships **5 lessons + a Level Review** (see [1.4.9](#149-chapter-content-the-five-lessons)).
- Because lessons are data, new lessons are fast to add — and in Phase 2 they become AI-generatable.

#### 1.4.4 Problem Types & Direct Manipulation
At minimum these interaction types, each validating against the content model:
- **Multiple choice** (concept checks).
- **Numeric input** (compute a side length / distance / area).
- **Tap-select** (e.g., identify the hypotenuse).
- **Slider** (adjust a side and watch the figure + numbers respond).
- **Plot points** (place points on a coordinate grid).
- **Drag-arrange** (rearrange triangles/pieces to form the proof).

Every lesson includes **at least one rich interaction beyond multiple choice**, chosen to teach that lesson's idea.

#### 1.4.5 Instant Feedback Engine
- Answers are validated **entirely client-side** against the content model → **< 100ms**, no network round-trip.
- Feedback is **specific and hand-written**: a short "why it's right" on success; on a wrong answer, a **targeted hint or explanation** mapped to the likely mistake (e.g., "Looks like you added the sides instead of their squares").
- Wrong answers let the learner **retry** and recover, never dead-end.

#### 1.4.6 Visuals & Simulations
- **SVG-based**, responsive, 60fps geometry the learner can manipulate:
  - A **right triangle** whose legs can be dragged; `a`, `b`, `c` and the equation update live.
  - **Squares built on the three sides**, whose areas update as the triangle changes.
  - An interactive **coordinate grid** for plotting points and seeing the right triangle between them.
  - A **drag-arrange proof** surface (four congruent triangles inside a square frame).
- Visuals respond in real time as the learner acts; the experiment *is* the lesson.

#### 1.4.7 Progress, Mastery & Resume
- Per-step results (attempts, correct/incorrect, hints used) are recorded.
- These roll up into a **per-lesson mastery score**; a lesson is **mastered** when the learner meets the mastery bar (see [open question](#open-questions--to-confirm)).
- **Resume**: the app stores the current step index, so leaving mid-lesson and returning continues exactly there.
- Mastery drives the **path**: unlock the next lesson, or recommend a review.

#### 1.4.8 Streaks & Milestones (Habit Loop)
- A **daily streak** that increments on a day's progress and breaks when a day is missed (longest streak tracked).
- **Milestones / badges** (e.g., first lesson done, 3-day streak, chapter complete).
- A satisfying **lesson-complete screen** (mastery result, streak update, next step).

#### 1.4.9 Chapter Content (the five lessons)
Modeled on Brilliant's "Level 6: Pythagoras," authored with our own problems, visuals, and feedback:

1. **Pythagoras' Theorem** — meet the right triangle (legs `a`, `b`; hypotenuse `c`) and `a² + b² = c²`. *Signature interaction:* drag the legs of a right triangle and watch `c` and the equation update; identify the hypotenuse; compute `c`.
2. **Direct Distance** — apply the theorem to straight-line distance (the "shortcut across the park"). *Signature interaction:* plot two points on a grid; the app draws the right triangle between them; compute the distance.
3. **Squares and Sides** — see the theorem as **areas**: the square on the hypotenuse equals the sum of the squares on the legs. *Signature interaction:* drag the legs and watch all three squares resize; fill in the missing area.
4. **Demonstrating Pythagoras** — build conviction it always holds by measuring/observing across several triangles. *Signature interaction:* a slider/draggable triangle plus a running `a² + b²` vs `c²` check.
5. **Proving Pythagoras** — the rearrangement proof. *Signature interaction:* drag four congruent triangles into a square frame two ways to reveal `a² + b² = c²`.
- **Level Review** — mixed retrieval practice across all five lessons.

> Computing a **missing side** (a leg or the hypotenuse) is woven through lessons 1–3, since it's the core skill a high-school student must walk away with.

### 1.5 Non-Functional Requirements
- **Performance:** feedback on an answer < 100ms (client-side validation); interactive visuals at 60fps during manipulation; < 2s to first interaction in a lesson (content bundled with the app, not fetched per-load).
- **Mobile:** works on phone-sized screens with **touch input** (pointer events for drag), adequate tap targets, no horizontal scroll.
- **Concurrency:** supports many concurrent learners with no slowdown — all per-user data; no shared write hot-spots.
- **Reliability:** progress writes survive reloads and brief disconnects (Firestore offline cache); resuming is consistent across devices.
- **Accessibility:** keyboard-usable inputs, sufficient contrast, respects `prefers-reduced-motion`, ARIA labels on interactive figures where feasible.
- **Security:** Firestore Security Rules restrict every learner to **their own subtree** (`users/{uid}/**`).
- **Cost:** content is bundled (no per-lesson reads); Firestore reads/writes scoped to the signed-in user.

### 1.6 Key Screens
1. **Sign-in / Sign-up** — email/password + Google; capture display name.
2. **Course map** — the chapter path (5 lessons + review), node states, streak, and next-step.
3. **Lesson player** — renders the step sequence; presents the interactive problem; shows instant feedback; progress within the lesson.
4. **Lesson complete** — mastery result, streak update, milestone (if any), recommended next step.
5. **Profile / progress** — streak, milestones, and a mastery overview of the chapter (lightweight).
6. **App chrome** — streak indicator + account/sign-out, present across signed-in screens.

### 1.7 Out of Scope
Intentionally excluded from the MVP (revisited in later phases):
- All AI features — problem generation, dynamic hints, adaptive path, chat tutor (Phase 2).
- Spaced repetition, interleaving engine, formal mastery-learning scheduler (Phase 3).
- Additional chapters or subjects.
- Content authoring / admin UI (lessons authored in code).
- Social, sharing, leaderboards, classrooms/teacher tools.
- Push notifications; full offline PWA.

### 1.8 Assumptions
- One chapter (the Pythagorean theorem), taught deeply, is the right scope for the MVP.
- Lesson content is **hand-authored and bundled** in the app (TypeScript/JSON), not stored in Firestore.
- Learners use modern mobile and desktop browsers.
- Firestore's free tier is sufficient for the test load (multiple concurrent learners).
- Email/password + Google are sufficient auth methods; no SSO/enterprise needs.

---

## 2. User Profile

### 2.1 Ideal Customer Profile (ICP)

> AlphaBrilliant is B2C. The "ICP" is the ideal *learner* segment.

**Primary ICP — "The high-school geometry student"**

| Attribute | Description |
| --- | --- |
| Age | ~14–16 (9th/10th grade) |
| Context | Taking geometry now, or revisiting it; first real exposure to the Pythagorean theorem |
| Devices | Phone-first (studies on mobile), sometimes a laptop |
| Behavior | Short study sessions; easily bored by lecture videos; learns by trying |
| Pain points | Geometry feels abstract; memorizes formulas without intuition; freezes on unfamiliar problems |
| Motivation | Wants to *understand* (and pass the test), feel progress, and not be lectured at |
| Success | Can look at a right triangle, set up `a² + b² = c²`, and solve for any missing side with confidence |

### 2.2 Personas

**Persona A — Maya, "The Frozen Beginner" (15, 9th grade)**
- Bright but anxious about math; geometry feels like a foreign language.
- Watches the class video, nods along, then blanks on the homework.
- **Wants:** to actually *get* why `a² + b² = c²`, by doing it, not memorizing it.
- **Loves:** dragging the triangle and *seeing* the squares match; getting a hint instead of a red X when she's wrong.

**Persona B — Leo, "The Test-Crammer" (16, 10th grade)**
- Has a unit test soon; knows the formula but makes setup mistakes under pressure.
- **Wants:** targeted practice on finding missing sides and distances, fast, on his phone.
- **Loves:** the streak and mastery bar — quick daily reps that feel like progress.

---

## 3. User Story

> One story per persona (see [2.2 Personas](#22-personas)): *I want [capability], so that [how AlphaBrilliant solves the problem].*

**Maya — "The Frozen Beginner":** I want to drag a right triangle and watch the squares on its sides match up, so that AlphaBrilliant lets me *discover* `a² + b² = c²` by hand and finally understand it instead of memorizing it.

**Leo — "The Test-Crammer":** I want quick, hands-on practice finding missing sides and distances with instant feedback when I slip, so that AlphaBrilliant rebuilds my confidence for the test in short daily sessions on my phone.

---

## 4. Tech Stack

### 4.1 Stack & Architecture

**Frontend**
- **React 19 + TypeScript + Vite** (existing project in `alpha-brilliant-clone/main`).
- **Interactive visuals:** SVG (crisp, responsive, easy to animate at 60fps with simple transforms); pointer events so drag works on touch.
- Mobile-first responsive layout with CSS; dark theme.
- Lightweight client routing for `/` (course map), `/lesson/:lessonId`, `/profile`, and the auth screen.

**Backend — Firebase**
| Concern | Service |
| --- | --- |
| Auth | Firebase Authentication (email/password + Google) |
| Database | Cloud Firestore (per-user progress, streaks, mastery) |
| Hosting | Firebase Hosting (`fir-94b95`) |

**Content model (in-app, not a database)**
- Each lesson is described as structured data so the renderer is generic and content is easy to add:

```ts
type Lesson = {
  id: string;
  title: string;
  conceptSummary: string;
  steps: Step[];
};

type Step =
  | { id: string; kind: "concept"; title: string; body: string; visual?: VisualSpec }
  | {
      id: string;
      kind: "problem";
      prompt: string;
      interaction: Interaction;       // mc | numeric | tap | slider | plot | drag-arrange
      visual?: VisualSpec;            // the responsive figure for this step
      validate: AnswerRule;           // ground-truth check (pure function)
      feedback: {
        correct: string;              // hand-written
        hints: HintRule[];            // targeted to likely wrong answers
        default: string;              // fallback explanation
      };
    };
```

**Architecture notes**
- **Feedback engine:** a pure, synchronous validator runs the step's `validate` rule against the learner's input → instant (< 100ms), specific feedback with no network call. (In Phase 2, AI augments — never replaces — this ground-truth check.)
- **Progress/mastery layer:** records per-step results, computes per-lesson mastery, decides unlocks and the next-step recommendation, and tracks streak state.
- **Persistence:** Firestore stores only **user state**; lesson content stays bundled, keeping loads fast and reads cheap.
- **Separation:** the content model + feedback rules are decoupled from rendering, so the same renderer drives every lesson (and later, generated lessons).

### 4.2 Data Model (Firestore — draft)

```
users/{uid}
  displayName, email, photoURL,
  createdAt,
  currentStreak, longestStreak, lastActiveDate (YYYY-MM-DD),
  milestones[]            // e.g. ["first-lesson", "streak-3", "chapter-complete"]

users/{uid}/progress/{lessonId}
  status,                 // "available" | "in_progress" | "completed" | "mastered"
  currentStepIndex,
  steps: {                // keyed by stepId
    [stepId]: { attempts, correct, hintsUsed, firstTryCorrect }
  },
  masteryScore,           // 0..1
  startedAt, completedAt, updatedAt
```

> Lesson definitions (the chapter content) live in the app source (e.g. `src/content/`), not in Firestore.

> Security: `users/{uid}` and everything beneath it are readable/writable **only** by the owner (`request.auth.uid == uid`); all other paths are denied. See `firestore.rules`.

---

## Open Questions / To Confirm

These are the decisions I want to lock with you before building (see chat):

1. **App display name** — using **"AlphaBrilliant"** as the in-app name (repo is `alpha-brilliant-clone`). Keep it?
2. **Lesson structure** — mirror Brilliant's exact node order (Pythagoras' Theorem → Direct Distance → Squares and Sides → Demonstrating Pythagoras → Proving Pythagoras → Level Review), or use a pedagogically re-ordered path (e.g. move *Squares and Sides* right after the theorem)?
3. **Mastery signal** — what marks a lesson "mastered" and unlocks the next one? (Proposed: complete every problem **and** get ≥ 80% correct on first try.)
4. **Streak rule** — what keeps a streak alive for the day? (Proposed: complete at least one lesson's worth of problems, i.e. finish ≥ 1 lesson **or** answer ≥ 3 problems correctly.)
5. **Auth details** — require email verification? (Proposed: no, to keep grader friction low.) Require a display name at email/password sign-up? (Proposed: yes.)
6. **Build workflow** — when we build Phase 1, work on `phase-1/mvp` inside `main/`, or create a sibling **worktree** `alpha-brilliant-clone/phase-1-mvp/` checked out to that branch?
