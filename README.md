# AlphaBrilliant

> **Subject: Geometry — the Pythagorean Theorem.** A learn-by-doing course (modeled on Brilliant) that teaches **one chapter deeply**, built for a high-school student.

AlphaBrilliant teaches the Pythagorean Theorem through hands-on, interactive problems — drag a triangle, plot points on a grid, rearrange a proof — with instant, specific feedback. No videos, no walls of text. You play with a concept until it clicks, then the idea is named.

- **Live app:** _coming soon (Firebase Hosting)_
- **Status:** Phase 1 (MVP) — in progress

## Subject & audience

- **Subject:** Geometry → the Pythagorean Theorem (one deep chapter, not a wide tour).
- **Persona:** a 9th/10th-grade student meeting (or revisiting) right triangles for the first time.
- **Course path (5 lessons + review):**
  1. **Pythagoras' Theorem** — meet `a² + b² = c²` by dragging a right triangle.
  2. **Squares and Sides** — see the theorem as areas of squares on each side.
  3. **Finding a Missing Side** — solve for a leg or the hypotenuse.
  4. **Direct Distance** — apply it to straight-line distance on a grid.
  5. **Proving Pythagoras** — rearrange four triangles to reveal the proof.
  - **Level Review** — mixed practice across the chapter.

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite
- **Auth:** Firebase Authentication (email/password + Google)
- **Data:** Cloud Firestore (progress, streaks, mastery)
- **Hosting:** Firebase Hosting
- **Visuals:** SVG for interactive, 60fps geometry

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

Build & preview a production bundle:

```bash
pnpm build
pnpm preview
```

Deploy to Firebase Hosting:

```bash
pnpm build
npx firebase deploy
```

> Firebase project: `fir-94b95`. The web config in `src/lib/firebase.ts` is a public client identifier — access is controlled by Firestore Security Rules (`firestore.rules`), not by hiding it.

## Architecture (overview)

- **Content model** — each lesson is a structured sequence of steps (concept / problem) described in data, not hard-coded HTML. This makes new lessons fast to add (and, in Phase 2, generatable by AI).
- **Feedback engine** — answers are validated client-side against the content model for instant (< 100ms), specific feedback; wrong answers get a targeted hint, not just a red X.
- **Progress & mastery** — per-step results roll up into per-lesson mastery; lessons unlock along a path, resume where you left off, and the app recommends a sensible next step.
- **Persistence** — `users/{uid}` (profile, streak, milestones) and `users/{uid}/progress/{lessonId}` in Firestore, so progress survives across sessions and devices.
- **Habit loop** — streaks, milestones, and a satisfying lesson-complete moment.

## Build phases

- **Phase 1 — MVP (no AI):** the core learn-by-doing app — one+ rich interactive lesson, instant feedback, persistence, a course path with mastery, streaks, auth, mobile, deployed. `phase-1/mvp`
- **Phase 2 — AI features:** grounded in lesson state (e.g. generated practice, targeted hints, adaptive path). `phase-2/ai-features`
- **Phase 3 — Learning science:** retrieval practice, spaced repetition, interleaving, mastery learning. `phase-3/learning-science`

## Repository layout

This app is the `main/` worktree inside the `alpha-brilliant-clone/` container; phase branches are added as sibling worktrees. Old project docs live in `alpha-brilliant-clone/Archived/`.
