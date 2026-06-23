# Product Requirements Document — AlphaBrilliant

> A learn-by-doing geometry app that teaches the **Pythagorean Theorem** through hands-on, interactive problems — modeled on Brilliant, built deep for one chapter.

| Field | Value |
| --- | --- |
| Document owner | Khoi |
| Status | Draft `v0.2` |
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

The core loop is the opposite of "watch a video, take a quiz." Every lesson drops the learner straight into an interactive problem: they **drag a triangle, plot points on a grid, or rearrange a proof**, get **instant, specific feedback**, and only then is the idea named. They play with the concept until it clicks. **No AI is used anywhere in the MVP** — every problem, visual, and feedback line is hand-built so the core experience stands on its own.

**Build approach (platform first):** the priority for the MVP is a working *platform*, not polished content. We build and prove end-to-end — the content model, lesson renderer, interaction components, feedback engine, progress + path, streaks, auth, and persistence — using **placeholder lessons** first. Real Pythagorean content is authored *after* the system works. The platform is the hard part; the lesson content is the easy part and slots into the content model later.

### 1.2 Problem Statement

Passive content does not stick, and geometry is where this hurts most. Students "watch" the Pythagorean theorem explained, memorize `a² + b² = c²`, and still freeze the moment a problem looks unfamiliar — because they never built the underlying intuition by *doing*.

Existing options fall into two traps: video-first apps (you watch someone else solve it) and quiz apps (shallow multiple-choice trivia that tests recall, not understanding). Neither lets a learner **touch a right triangle, get it wrong, and figure it out**.

**Problem:** high-school students need to *build* an intuition for the Pythagorean theorem through hands-on manipulation and instant feedback — but the tools they have either lecture at them or quiz them, and do neither deeply.

### 1.3 Goals & Non-Goals

**Goals (MVP)**
- Ship a **working learn-by-doing platform** — content model → renderer → interactions → feedback → progress → path → streaks → persistence — proven end-to-end with **placeholder lessons**, before authoring real content.
- Teach through **interactive, hands-on problems**, not video or walls of text.
- Include **at least one rich problem type beyond multiple choice** (drag, plot, slider, rearrange).
- Provide a **visual element the learner manipulates** and watches respond.
- Give **instant (< 100ms), specific, hand-written feedback**; wrong answers get a targeted hint, not just a red X.
- **Persist progress**: leave mid-lesson, return on any device, pick up where you stopped.
- Provide a **course path** that unlocks lessons and **recommends a sensible next step** (basic completion-based progression for the MVP; richer mastery logic deferred — see [Decisions & Deferred](#decisions--deferred-items)).
- Include a **basic, persisted daily streak** (the MVP test verifies the streak survives sessions); milestones are a light add-on.
- **Accounts with names** via **email/password and Google**.
- **Mobile-first**, touch-friendly, 60fps visuals, < 2s to first interaction.
- **Deployed, public** on Firebase Hosting.
- The whole thing **teaches with zero AI**.

**Non-Goals (explicitly out of scope for the MVP)**
- Any AI: problem generation, hints, adaptive paths, chat tutor (→ Phase 2).
- Formal learning-science systems: spaced-repetition scheduler, interleaving engine (→ Phase 3). Immediate explanatory feedback is in scope; the rest is not.
- Finalized lesson content and ordering (MVP ships placeholders; real content comes later).
- Detailed mastery thresholds and streak rules (kept minimal for the MVP, refined later).
- Additional chapters or subjects beyond the Pythagorean theorem.
- A content-authoring / admin UI (lessons are authored in code).
- Social features, leaderboards, sharing.
- Push notifications and full offline PWA support.

> Full exclusions are detailed in [1.7 Out of Scope](#17-out-of-scope).

### 1.4 Core Features

#### 1.4.1 Accounts & Profile (Auth)
- Sign up / sign in with **email + password** *and* **Google** (Firebase Authentication) — learners choose either.
- Capture a **display name** (from the form, or from the Google profile) so learners have names.
- **No email verification** for the MVP (keeps grader/learner friction low).
- On first sign-in, create a `users/{uid}` profile document (name, email, streak fields, milestones).
- Persistent sessions; signed-out users are routed to sign-in, signed-in users to the course.

#### 1.4.2 Course Path & Map
- A Brilliant-style **course map** showing the chapter as an ordered path of lesson nodes.
- Each node shows its **state**: locked, available, in-progress, or completed.
- Lessons **unlock sequentially** as the learner completes the previous one.
- The map surfaces a clear **"continue / next step" recommendation**.
- The map header shows the **current streak** and overall progress.

#### 1.4.3 Interactive Lessons (content-model driven)
- A lesson is a short (a few minutes) **ordered sequence of steps**, defined by a **content model** (structured data), not hard-coded HTML.
- Two step kinds: **concept** (a brief idea, often with a visual) and **problem** (something the learner does).
- For the MVP, the course is populated with **placeholder lessons** that exercise the engine and every interaction type; real content slots in later.
- Because lessons are data, new lessons are fast to add — and in Phase 2 they become AI-generatable.

#### 1.4.4 Problem Types & Direct Manipulation
The renderer supports these interaction types, each validating against the content model:
- **Multiple choice** (concept checks).
- **Numeric input** (compute a side length / distance / area).
- **Tap-select** (e.g., identify the hypotenuse).
- **Slider** (adjust a value and watch the figure + numbers respond).
- **Plot points** (place points on a coordinate grid).
- **Drag-arrange** (rearrange pieces, e.g. to form a proof).

Every lesson includes **at least one rich interaction beyond multiple choice**.

#### 1.4.5 Instant Feedback Engine
- Answers are validated **entirely client-side** against the content model → **< 100ms**, no network round-trip.
- Feedback is **specific and hand-written**: a short "why it's right" on success; on a wrong answer, a **targeted hint or explanation** mapped to likely mistakes.
- Wrong answers let the learner **retry** and recover, never dead-end.

#### 1.4.6 Visuals & Simulations
- **SVG-based**, responsive, 60fps geometry the learner can manipulate (e.g. a right triangle with draggable legs, squares on the sides, a coordinate grid, a drag-arrange surface).
- Visuals respond in real time as the learner acts; the experiment *is* the lesson.
- Built as **reusable components** driven by the content model's visual spec.

#### 1.4.7 Progress, Resume & Path
- Per-step results (attempts, correct/incorrect, hints used) are recorded.
- **Resume**: the app stores the current step index, so leaving mid-lesson and returning continues exactly there.
- For the MVP, **completing a lesson's problems unlocks the next** and drives the next-step recommendation. A richer **mastery signal** (thresholds, first-try accuracy, gating) is **tracked but deferred** — to be designed later.

#### 1.4.8 Streak (Habit Loop)
- A **basic daily streak** that increments on a day's progress and breaks when a day is missed (longest streak tracked).
- **Persisted** across sessions and devices (explicitly verified by the MVP test scenario).
- A satisfying **lesson-complete screen** (progress + streak update + next step).
- The exact "what counts as a day's progress" rule and any **milestones/badges** are a light add-on, refined later.

#### 1.4.9 Chapter Content — Roadmap (authored later)
The MVP ships **placeholder lessons**. The real chapter below is the **roadmap** (modeled on Brilliant's "Level 6: Pythagoras"); its **final order and content are TBD** and will be authored once the platform works:

1. **Pythagoras' Theorem** — meet `a² + b² = c²` by dragging a right triangle.
2. **Direct Distance** — straight-line distance on a grid (plot two points).
3. **Squares and Sides** — the theorem as areas of squares on each side.
4. **Demonstrating Pythagoras** — build conviction it always holds.
5. **Proving Pythagoras** — the rearrangement proof.
- **Level Review** — mixed practice across the chapter.

> Computing a **missing side** (a leg or the hypotenuse) is the core skill the learner must walk away with, and will be woven through the lessons.

### 1.5 Non-Functional Requirements
- **Performance:** feedback < 100ms (client-side validation); interactive visuals at 60fps; < 2s to first interaction (content bundled with the app, not fetched per-load).
- **Mobile:** works on phone-sized screens with **touch input** (pointer events for drag), adequate tap targets, no horizontal scroll.
- **Concurrency:** supports many concurrent learners with no slowdown — all per-user data; no shared write hot-spots.
- **Reliability:** progress writes survive reloads and brief disconnects (Firestore offline cache); resuming is consistent across devices.
- **Accessibility:** keyboard-usable inputs, sufficient contrast, respects `prefers-reduced-motion`, ARIA labels on interactive figures where feasible.
- **Security:** Firestore Security Rules restrict every learner to **their own subtree** (`users/{uid}/**`).
- **Cost:** content is bundled (no per-lesson reads); Firestore reads/writes scoped to the signed-in user.

### 1.6 Key Screens
1. **Sign-in / Sign-up** — email/password + Google; capture display name.
2. **Course map** — the chapter path, node states, streak, and next-step.
3. **Lesson player** — renders the step sequence; presents the interactive problem; shows instant feedback; progress within the lesson.
4. **Lesson complete** — progress result, streak update, recommended next step.
5. **Profile / progress** — streak and a progress overview of the chapter (lightweight).
6. **App chrome** — streak indicator + account/sign-out, present across signed-in screens.

### 1.7 Out of Scope
Intentionally excluded from the MVP (revisited in later phases):
- All AI features — problem generation, dynamic hints, adaptive path, chat tutor (Phase 2).
- Spaced repetition, interleaving engine, formal mastery-learning scheduler (Phase 3).
- Finalized lesson content/order; detailed mastery and streak logic.
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
- **Loves:** the streak — quick daily reps that feel like progress.

---

## 3. User Story

> One story per persona (see [2.2 Personas](#22-personas)): *I want [capability], so that [how AlphaBrilliant solves the problem].*

**Maya — "The Frozen Beginner":** I want to drag a right triangle and watch the squares on its sides match up, so that AlphaBrilliant lets me *discover* `a² + b² = c²` by hand and finally understand it instead of memorizing it.

**Leo — "The Test-Crammer":** I want quick, hands-on practice finding missing sides and distances with instant feedback when I slip, so that AlphaBrilliant rebuilds my confidence for the test in short daily sessions on my phone.

---

## 4. Tech Stack

### 4.1 Stack & Architecture

**Frontend**
- **React 19 + TypeScript + Vite** (project in `alpha-brilliant-clone/main`).
- **Interactive visuals:** SVG (crisp, responsive, 60fps with simple transforms); pointer events so drag works on touch.
- Mobile-first responsive layout; dark theme.
- Lightweight client routing for `/` (course map), `/lesson/:lessonId`, `/profile`, and the auth screen.

**Backend — Firebase**
| Concern | Service |
| --- | --- |
| Auth | Firebase Authentication (email/password + Google) |
| Database | Cloud Firestore (per-user progress, streaks) |
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
- **Progress layer:** records per-step results, handles resume, decides unlocks and the next-step recommendation, and tracks streak state. (Detailed mastery logic comes later.)
- **Persistence:** Firestore stores only **user state**; lesson content stays bundled, keeping loads fast and reads cheap.
- **Separation:** the content model + feedback rules are decoupled from rendering, so the same renderer drives every lesson (and later, generated lessons).

### 4.2 Data Model (Firestore — draft)

```
users/{uid}
  displayName, email, photoURL,
  createdAt,
  currentStreak, longestStreak, lastActiveDate (YYYY-MM-DD),
  milestones[]            // light add-on, e.g. ["first-lesson", "streak-3"]

users/{uid}/progress/{lessonId}
  status,                 // "available" | "in_progress" | "completed"
  currentStepIndex,
  steps: {                // keyed by stepId
    [stepId]: { attempts, correct, hintsUsed, firstTryCorrect }
  },
  startedAt, completedAt, updatedAt
```

> Lesson definitions (the chapter content) live in the app source (e.g. `src/content/`), not in Firestore.

> Security: `users/{uid}` and everything beneath it are readable/writable **only** by the owner (`request.auth.uid == uid`); all other paths are denied. See `firestore.rules`.

### 4.3 Repository & Branching
- The app lives in `alpha-brilliant-clone/main` (the `main` worktree); phase work happens in sibling worktrees.
- **Environment branches:** `dev → staging → main → prod` (one-way promotion).
- **Phase branches:** `phase-1/mvp`, `phase-2/ai-features`, `phase-3/learning-science`.
- Full git workflow and conventions are documented in [`AGENTS.md`](./AGENTS.md).

---

## Decisions & Deferred Items

**Locked**
- **Name:** AlphaBrilliant (repo `alpha-brilliant-clone`).
- **Subject / persona:** Pythagorean theorem; high-school student.
- **Auth:** email/password **and** Google; no email verification; capture a display name.
- **Streak:** in scope for the MVP (basic, persisted); milestones are a light add-on.
- **Approach:** platform-first with placeholder lessons; real content authored later.
- **Branching:** `dev/staging/main/prod` + phase branches (see `AGENTS.md`).

**Deferred (decide later, not blocking the MVP build)**
- Final lesson **order and content**.
- Detailed **mastery** logic (thresholds, gating).
- Exact **streak rule** and **milestone** set.
