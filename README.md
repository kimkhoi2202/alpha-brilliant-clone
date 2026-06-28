# AlphaBrilliant

> **Subject: Geometry — the Pythagorean Theorem.** A learn-by-doing course (modeled on Brilliant) that teaches **one chapter deeply**, built for a high-school student.

AlphaBrilliant teaches the Pythagorean Theorem through hands-on, interactive problems — drag a triangle, plot points on a grid, rearrange a proof — with instant, specific feedback. No videos, no walls of text. You play with a concept until it clicks, then the idea is named.

- **Live app:** **[main-alpha-pink.vercel.app](https://main-alpha-pink.vercel.app)** — the voice-first Koji tutor, live end-to-end on Vercel.
- **Status:** Phase 2 (AI features) — the AI-native Koji tutor + verified practice, additive over the Phase 1 MVP.

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
- **AI backend:** Vercel serverless functions (`/api`) — grounded, verified Koji tutor
- **Hosting / deploy:** Vercel (Vite frontend + `/api` functions); Firebase Hosting kept as a frontend-only mirror
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

Deploy (canonical — Vercel, runs the AI `/api` functions):

```bash
vercel --prod        # https://main-alpha-pink.vercel.app
```

Deploy the frontend-only mirror to Firebase Hosting:

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
- **Phase 2 — AI features:** the AI-native **Koji** tutor + verified generation, grounded in lesson state (see below). `phase-2/ai-features`
- **Phase 3 — Learning science:** retrieval practice, spaced repetition, interleaving, mastery learning. `phase-3/learning-science`

## Phase 2 — AI features (Koji)

Phase 2 makes the app **AI-native** without making AI load-bearing. It adds **Koji**, a tool-using tutor the learner can read *and talk to*, plus an engine that generates fresh, verified practice. Every AI output is grounded in typed lesson state and checked by our own code before the learner sees it.

- **Koji, the grounded tutor**
  - **Progressive hints** — tiered nudges (name the idea → next step → set it up with your numbers) that stop short of the answer.
  - **Personalized explanations** — the mistake is classified deterministically from your answer vs. the engine's, then phrased warmly ("you added the legs instead of squaring").
  - **Realtime voice** — speech-to-speech with `gpt-realtime-2`: tap-to-talk or hands-free, a live transcript, natural barge-in.
  - **App tool-control** — Koji can navigate lessons, generate practice, set difficulty, read progress, celebrate, and (effort-gated) reveal a worked solution — the same typed tools drive both the text and voice agents.
- **Verified "Infinite Practice"** — a dedicated mode (after the course's Level Review) that generates new problems at adaptive difficulty. The model proposes; **we compute the answer key** and round-trip it through `gradeStep(correctAnswer())` before display — so a generated problem is always solvable and graded correctly.

### Teaches with AI off (guarantee)

All AI sits behind the `VITE_AI_ENABLED` flag (default `false`). **With AI off, the app is byte-for-byte the Phase 1 experience** — hand-written hints/feedback, the fixed lesson path, the plain "See answer", zero network calls to AI. Every AI wrapper early-returns a safe result and degrades gracefully on error/timeout, so the learner never hits a broken tutor.

### Architecture (overview)

```
Browser (React) ──callable (Auth)──▶ Firebase Cloud Functions ──▶ OpenAI
   │  grounding payload (typed state)   runTutor / generateProblem      gpt-5.5
   │  VERIFICATION FIREWALL             mintRealtimeToken               gpt-5.4-mini
   └─ realtime voice ◀──ephemeral token (WebRTC)──────────────────────  gpt-realtime-2
```

- The browser **never** calls OpenAI directly. Text hints/explanations/generation go through authenticated **callable Cloud Functions** that hold the key; realtime voice uses a **short-lived ephemeral token** so the long-lived key never reaches the client.
- The **verification firewall** (`src/lib/ai/verify.ts`, the pure engine + `math.js`) is the rule: nothing AI-proposed — a generated problem, a revealed answer — is shown until it passes. Hints are post-checked so they can't leak the answer.
- Models (locked, PRD §2.2): **`gpt-5.5`** (text + structured-output generation), **`gpt-5.4-mini`** (cheap Tier-1 hints), **`gpt-realtime-2`** (voice).

### Setup (AI backend)

The AI backend lives in a separate **`functions/`** workspace (Firebase Cloud Functions, 2nd gen, Node 22).

```bash
# 1. Backend secret (local/emulator) — never VITE_-prefixed, never committed
echo "OPENAI_API_KEY=sk-..." > functions/.env

# 2. Enable AI in the client (default is off)
echo "VITE_AI_ENABLED=true" >> .env.local

# 3. Run the app + functions emulator
pnpm dev
cd functions && pnpm install && pnpm build   # build the functions workspace
```

- `OPENAI_API_KEY` is **server-only** (in `functions/.env` locally, a Functions secret in prod). It is never bundled into the client.
- `VITE_AI_ENABLED` is the client flag; leave it `false` to ship/verify the AI-off path, then flip it on.
- **Blaze plan** is required **only to deploy Cloud Functions** (outbound network calls). Firebase Hosting and the entire AI-off app run without it.

## Repository layout

This app is the `main/` worktree inside the `alpha-brilliant-clone/` container; phase branches are added as sibling worktrees. Old project docs live in `alpha-brilliant-clone/Archived/`.
