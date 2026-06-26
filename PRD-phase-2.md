# Product Requirements Document — AlphaBrilliant (Phase 2: AI Features)

> Phase 2 makes the working Pythagorean app **AI-native**: a tool-using tutor (**Koji**) the learner can read *and talk to*, who can see the lesson's **structured state** and **drive the app** — plus an engine that **generates fresh, verified practice**. Every AI output is grounded in typed state (not raw text), checked against the subject's logic (the pure feedback engine + `math.js`), and **additive**: the app must still teach with **AI turned off**.

**Status:** Decisions LOCKED (see §2) · **Gate:** Phase 1 frozen at `phase-1/mvp` / tag `v1.0-phase-1-mvp` · **Target:** Friday

**Contents:** [1. Phase 2](#1-phase-2) · [2. Decisions](#2-decisions-locked) · [3. Architecture](#3-architecture) · [4. Features](#4-features) · [5. Acceptance](#5-acceptance-criteria--test-plan) · [6. Appendix](#6-appendix)

---

## 1. Phase 2

### 1.1 Overview

Phase 1 proved the core loop: a learn-by-doing Pythagorean course where every problem is structured data (`ProblemStep` → `Interaction` + `VisualSpec` + hand-written `Feedback`), graded by a **pure, synchronous, client-side engine** (`gradeStep`, `src/content/engine.ts`) in `< 100ms`, with **zero AI**.

Phase 2 follows the brief's order — **decide, then build** — and makes the app **AI-native** on top of that proven base. "AI-native" here means a single intelligent companion, **Koji**, that:

1. **Sees the lesson's structured state** (the current `ProblemStep`, the learner's `AnswerValue`, their `StepRecord` history) — never scraped screen text.
2. **Talks and listens** — a realtime voice conversation (OpenAI `gpt-realtime-2`) in addition to text.
3. **Acts via tools** — Koji can call typed app tools to navigate lessons, generate practice, set difficulty, explain a miss, and (on request) reveal a worked solution — i.e. genuinely *operate the app* with the learner.

Plus a second pillar: **verified, adaptive problem generation** so the course never runs dry.

**Same subject, same persona.** Still the Pythagorean theorem; still Maya ("frozen beginner") and Leo ("test-crammer") from `PRD-phase-1.md` §2.

### 1.2 Principles (non-negotiable)


| #   | Principle                                    | How we honor it                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | **Additive, never load-bearing**             | All AI sits behind `VITE_AI_ENABLED`. Off ⇒ the exact Phase 1 experience (static hints, hand-written feedback, fixed lessons). The brief requires the app still teach with AI off.                                                                                                                             |
| P2  | **Ground in structured state, not raw text** | Every prompt/tool call is built from typed state (`ProblemStep`, `Interaction` incl. the embedded answer, `AnswerValue`, `StepRecord`) serialized as compact JSON.                                                                                                                                             |
| P3  | **Verify everything checkable**              | Ground truth comes from `correctAnswer()` / `gradeStep()` + `math.js`. The model proposes/phrases; our code decides.                                                                                                                                                                                       |
| P4  | **The AI never emits a wrong answer**        | Generated problems get their answer **computed by us** and round-tripped through `gradeStep(correctAnswer())` before display. Even "reveal the solution" is **computed by our engine**, not the model — so a shown answer is always correct. Hints are post-checked so they don't leak the answer prematurely. |
| P5  | **Keep Phase 1 performance**                 | Pure grading stays `< 100ms`, never blocks on the network. AI is async with skeletons and a **graceful fallback** to static hints/feedback on error/timeout.                                                                                                                                                   |
| P6  | **Secrets stay server-side**                 | The OpenAI key lives only in Cloud Functions / `.env` (server). The browser uses **short-lived ephemeral tokens** for realtime; the key is never bundled.                                                                                                                                                      |
| P7  | **Cost-aware**                               | Usage tracked per learner (Firestore counters), response caching, small grounded prompts, and a cheap model for high-volume hints. **No app-level caps initially** (owner's call) — rely on OpenAI dashboard limits; per-learner caps are easy to switch on later.                                                                                                                            |


---

## 2. Decisions (LOCKED)

### 2.1 What we ship


| Pillar                               | Decision | Notes                                                                                                                                                                                                                |
| ------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Koji, the AI-native tutor**    | ✅ SHIP   | Text hints (progressive) + tailored wrong-answer explanations + **realtime voice conversation** + **tool-calling app control**. Lights up the already-built, dormant "Ask Koji" surface (`bracketsOn: false` today). |
| **B — Verified adaptive generation** | ✅ SHIP   | Schema-valid `ProblemStep`s; answers computed & verified by us; difficulty from `StepRecord`. "Infinite practice."                                                                                                   |


### 2.2 Stack & infrastructure (locked)


| Choice                  | Decision                                                                          | Why                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                 | **Firebase Cloud Functions** (2nd gen) on the **Blaze** plan (`fir-94b95`)        | Holds the OpenAI key, proxies model calls, mints realtime ephemeral tokens, enforces rate limits. Integrates with Firebase Auth. *(Blaze is required for outbound calls — to be enabled by the owner.)* |
| AI framework            | **OpenAI Agents SDK (TypeScript)** — `@openai/agents` + `@openai/agents/realtime` | Gives the agent loop, tool-calling, guardrails, tracing, and browser voice agents. Drops to the **Responses API + structured outputs** under the hood for Pillar B.                                     |
| Text / generation model | `gpt-5.5` (Responses API, strict structured outputs)                          | Current flagship; schema-enforced JSON for safe generation.                                                                                                                                             |
| High-volume hints model | `gpt-5.4-mini`                                                                  | Cheap, fast Tier-1 hints to control cost.                                                                                                                                                               |
| Realtime voice model    | `gpt-realtime-2`                                                              | GA speech-to-speech, GPT-5-class reasoning, 128K ctx, **parallel tool calls with spoken preambles** ("let me pull that up" while acting).                                                               |
| Math ground truth       | `math.js` + the existing pure engine                                          | The model never asserts a computed fact.                                                                                                                                                                |


### 2.3 Tool authority (pedagogy guardrail)

Koji may **control everything in the app** via tools (navigate, generate, explain, set difficulty, read progress, celebrate). The one guardrail that protects the learn-by-doing loop and the grading scenario is **how the answer is revealed** — earned, not free:

- **Effort-gated.** The old instant "See answer" is removed while AI is on. Koji reveals the worked answer only after the learner has **genuinely attempted** the step (real attempts in `StepRecord`) **and engaged with Koji first** (a hint or a short back-and-forth). No effort, no answer.
- **Personalized.** When it reveals, it doesn't just show the number — it **names the learner's specific gap** (inferred from their wrong answers + the conversation) and walks them through it. The answer itself is **engine-computed** (always correct, per P4).
- **Marked `assisted`.** A revealed step never counts as first-try mastery.
- **AI-off fallback.** With AI off, the Phase 1 plain "See answer" remains, so the app still teaches end-to-end.

### 2.4 Explicitly skipped / deferred

- **Skip:** AI-generated **visuals/figures** (use the safe hand-built `VisualSpec` set); AI-authored **whole lessons** (generate *problems within the proven schema*, not new pedagogy); AI **rewriting** the hand-written feedback (it's the AI-off fallback). A generic "web chatbot" is *not* what we're building — Koji is grounded and tool-scoped, not an open chat box.
- **Defer → Phase 3:** spaced repetition / mastery scheduling / full adaptive *sequencing* (that's learning-science). Phase 2 adapts only **difficulty** inside generation.

---

## 3. Architecture

### 3.1 Components

```
┌────────────────────────── Browser (React 19) ──────────────────────────┐
│  Lesson player (typed state)   Koji UI (text + mic)                      │
│  ├─ grounding payload builder   ├─ @openai/agents/realtime (RealtimeSession)
│  ├─ app TOOL layer  ───────────┘   (voice; runs tools client-side)       │
│  └─ VERIFICATION FIREWALL  (engine + math.js)  ← nothing shown unchecked │
└───────────────▲───────────────────────────────────────────▲────────────┘
                │ callable (Auth)                            │ ephemeral token (WebRTC)
┌───────────────┴───────────── Firebase Cloud Functions ─────┴────────────┐
│  runTutor / generateProblem  (Agents SDK + Responses API, holds API key) │
│  mintRealtimeToken           (creates short-lived gpt-realtime-2 session)│
│  rate limit + daily cap (Firestore users/{uid}/aiUsage)                  │
└───────────────▲──────────────────────────────────────────────▲─────────┘
                │                                                │
                └──────────────── OpenAI API ───────────────────┘
                     gpt-5.5 · gpt-5.4-mini · gpt-realtime-2
```

The **verification firewall** is the rule: model output (a generated problem, a revealed answer) passes `gradeStep`/`math.js` before the learner ever sees it.

### 3.2 Where each model runs

- **Text hints / explanations / generation:** browser → **callable Cloud Function** (holds key) → `gpt-5.5`/`gpt-5.4-mini` via Agents SDK / Responses API → verified locally → rendered.
- **Realtime voice:** `mintRealtimeToken` function returns a short-lived token; the browser opens a `RealtimeSession` (WebRTC) with `gpt-realtime-2`; **tools execute in the browser**, so Koji can drive the app live. The long-lived key never leaves the server.

### 3.3 Tool catalog (the app-control surface)

Typed tools (Zod-validated) exposed to both the text agent and the voice agent:


| Tool                                      | Effect                                                        | Guard                                                     |
| ----------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `goToLesson(lessonId)` / `resumeLesson()` | Navigate the course path                                      | —                                                         |
| `giveHint(level)`                         | Progressive hint for the current step                         | Post-checked: must not leak the answer                    |
| `explainMiss()`                           | Plain-language explanation of the learner's last wrong answer | Diagnosis computed deterministically first                |
| `generatePractice(opts)`                  | Create verified new problems (Pillar B)                       | Answer computed by us + `gradeStep` gate                  |
| `setDifficulty(level)`                    | Adjust generated difficulty                                   | Derived from `StepRecord` by default                      |
| `readProgress()`                          | Read streak / XP / mastery signal                             | Read-only, own data only                                  |
| `revealSolution()`                        | Show the worked answer                                        | Learner-initiated; engine-computed; marks step `assisted` |
| `celebrate()`                             | Fire Koji's success/streak animations                         | Cosmetic                                                  |


### 3.4 Content-model additions (small, backward-compatible)

- `ProblemStep.source?: "authored" | "ai"` (defaults to `"authored"` — all Phase 1 content unchanged).
- `StepRecord.assisted?: boolean` (set when `revealSolution` was used; excluded from first-try mastery).
- No new interaction kinds; generation is restricted to verifiable kinds (`numeric`, `count-squares`, `pick-side`, `multiple-choice`, `tile-expression`).

### 3.5 Data model additions (Firestore)

```
users/{uid}/aiUsage/{YYYY-MM-DD}   # text calls + realtime minutes (rate limit / cost cap)
users/{uid}/generated/{problemId}  # cached AI problems (computed answer key, source:"ai")
aiCache/{stepId}/{answerHash}       # optional de-identified explanation cache
```

Security rules keep `users/{uid}/**` owner-only (unchanged from Phase 1).

### 3.6 Secrets, env & deps

- `OPENAI_API_KEY` — server-only, in `.env` (gitignored) for local/emulator and a **Functions secret** in prod. **Never** `VITE_`-prefixed.
- `VITE_AI_ENABLED` — client flag (default `false`).
- New deps: `@openai/agents` (+ realtime), `mathjs`, `zod`; a `functions/` workspace (Node 22) for Cloud Functions.

### 3.7 Branching & deploy

- **Pillar A** on `phase-2/koji-tutor` (off `phase-2/ai-features`) — foundation + tools + text tutor + realtime voice.
- **Pillar B** on `phase-2/problem-generation` (stacked **off `phase-2/koji-tutor`**), rebased onto A as A evolves.
- Merge back: `phase-2/koji-tutor` → `phase-2/ai-features` → `main` → `prod`. Push to `prod` runs the existing Firebase Hosting deploy; we add a **Functions deploy** step (needs Blaze).
- Ship to prod with `VITE_AI_ENABLED=false`, verify, then flip on.

---

## 4. Features

### 4.1 Pillar A — Koji, the AI-native tutor

- **Text hints (progressive):** Tier 1 name the idea → Tier 2 next step → Tier 3 set it up with their numbers, stopping short of the result. Auto-offered after **≥ 2 wrong attempts**.
- **Tailored explanations:** on a miss, we **classify the mistake deterministically** from `AnswerValue` vs `correctAnswer()` (e.g. "added the legs instead of squaring"), then the model phrases it for this learner.
- **Realtime voice:** **tap-to-talk** by default, with an optional **hands-free / always-listening** mode the learner can toggle on. Koji hears the learner, sees the current step's state, responds in a warm, encouraging voice (`gpt-realtime-2`), shows a **live transcript**, and **calls tools mid-conversation** (e.g. "ok, generating two more like this" → `generatePractice`).
- **App control:** all tools in §3.3, available to both text and voice.
- **Reveal-solution:** effort-gated (genuine attempt + Koji engagement required), engine-computed, **personalized to the learner's gap**, marks the step `assisted` (§2.3).
- **AI-off fallback:** every path degrades to the Phase 1 static `HintRule`/`Feedback`; the learner never hits a broken tutor.

### 4.2 Pillar B — Verified adaptive problem generation

1. We pick **template + difficulty** from `StepRecord` (first-try accuracy, attempts, hints used).
2. The model returns a **schema-valid `ProblemStep`** (strict structured output) restricted to verifiable interaction kinds.
3. **We compute the answer key** (`a²+b²=c²` via `math.js`); for MC we verify exactly one correct option and genuinely-wrong distractors.
4. **Validation gate:** `gradeStep(step, correctAnswer(step.interaction))` must return `correct`, visuals must reference existing `VisualSpec` kinds, KaTeX/strings must parse — else discard & regenerate (or fall back to a hand-built template bank).
5. Accepted problems render through the existing renderer, tagged `source:"ai"`, and are **cached**.

**Surface:** a single dedicated **"Infinite Practice"** mode (reached after the course's `level-review`) — *not* a per-lesson button. Keeps generation in one clear place.

### 4.3 Unchanged from Phase 1

Instant client grading, hand-written feedback, the fixed path, streaks, persistence, auth, mobile, deployed URL — all functional with `VITE_AI_ENABLED=false`.

---

## 5. Acceptance criteria & test plan

**Pass gate:**

- [ ] AI features documented (this doc): shipped / skipped / deferred with rationale.
- [ ] **App fully teaches with AI off** (`VITE_AI_ENABLED=false`) — identical to Phase 1.
- [ ] Every AI feature grounded in structured state, not raw text.
- [ ] **AI never presents a wrong answer:** generation passes the `gradeStep` round-trip; revealed solutions are engine-computed; hints don't leak answers.
- [ ] No OpenAI key in the client bundle; realtime uses ephemeral tokens.
- [ ] Instant grading stays `< 100ms`; AI is async and degrades gracefully.

**Scenarios (graders will run):**

- [ ] Get stuck → ask Koji (text) → progressive hint that helps without giving the answer.
- [ ] **Talk to Koji (voice)** → he answers and performs an action via a tool (e.g. generates practice, navigates).
- [ ] Answer wrong a specific way → "Why was that wrong?" explains *that* mistake.
- [ ] Finish a lesson → generate fresh practice at sensible difficulty; every generated problem is solvable and graded correctly.
- [ ] `VITE_AI_ENABLED=false` → app still teaches end-to-end; no broken UI.
- [ ] Network/AI failure → graceful fallback to static hint; no dead-end.
- [ ] All of the above on a phone-sized screen.

**Budgets:** text hint/explanation responds within ~2–3s (skeleton shown); generation validated before display. No app-level usage caps initially (usage *tracked*; rely on OpenAI dashboard limits) — per-learner caps are easy to switch on later.

**Reveal-solution test:** "See answer" is not available until the learner has attempted and engaged Koji; once unlocked, the reveal names the learner's specific gap (not just the number).

---

## 6. Appendix

### 6.1 Decision log

**Locked:** Ship A (Koji tutor: text + voice + tools) and B (verified generation) · Backend = Cloud Functions (Blaze) · Framework = OpenAI Agents SDK (TS) + Responses API · Models = `gpt-5.5` / `gpt-5.4-mini` / `gpt-realtime-2` · Tools can control the app; reveal-solution is **effort-gated + personalized**, engine-computed, marked assisted · AI is additive & flag-gated · Verify with engine + `math.js` · Skip AI visuals / whole-lessons / feedback-rewrite · Defer spaced-repetition & sequencing to Phase 3.

**Decided this round:** reveal-solution = effort-gated + personalized gap explanation (engine-computed, marked assisted) · **no app-level cost caps initially** (usage tracked; OpenAI dashboard limits) · generation surface = a single dedicated **"Infinite Practice"** mode · voice = **tap-to-talk + optional hands-free**, live transcript, warm voice. **Open (minor):** final tool naming.

### 6.2 Branch plan

```
phase-2/ai-features            (base = frozen Phase 1, e464e12)
   └─ phase-2/koji-tutor        (Pillar A: foundation + tools + text tutor + voice)
        └─ phase-2/problem-generation   (Pillar B, stacked; rebase onto A as A changes)
```

Merge A → `phase-2/ai-features` → `main` → `prod` when A is solid; rebase B onto the updated base before merging B.

### 6.3 Build order (vertical slices)

1. **Foundation (A):** `VITE_AI_ENABLED`, `functions/` workspace, `mintRealtimeToken` + `runTutor` callables (key server-side), Agents SDK + `mathjs`, grounding-payload builder, verification firewall, graceful fallback.
2. **Tool layer (A):** the typed app tools in §3.3.
3. **Text tutor (A):** progressive hints → deterministic-diagnosis explanations → wire to the "Ask Koji" surface.
4. **Realtime voice (A):** browser `RealtimeSession` with `gpt-realtime-2`, tools wired, mic UI, barge-in.
5. **Generation (B):** generation contract + validation gate → "infinite practice" surface → difficulty from `StepRecord`.
6. **Guardrails:** response caching + per-learner usage tracking (app-level caps off by default, easy to enable later).
7. **QA** (§5) incl. AI-off + mobile → promote `phase-2/koji-tutor → phase-2/ai-features → main → prod` (AI off), then flip on.

### 6.4 Cost note

`gpt-realtime-2` is the expensive path ($32 / $64 per 1M audio in/out). Per the owner's call there are **no app-level caps initially** — rely on OpenAI dashboard limits and monitor usage. Mitigations still in place: cheap model (`gpt-5.4-mini`) for text hints, response caching, small grounded prompts, and per-learner usage counters so caps can be switched on later without a redesign.

### 6.5 Milestones


| Item                                                                    | Target          |
| ----------------------------------------------------------------------- | --------------- |
| Pillar A (Koji: text + voice + tools), grounded & verified, AI-off safe | Fri             |
| Pillar B (verified adaptive generation)                                 | Fri             |
| Demo video + Brainlift (decisions: shipped/skipped/deferred)            | Sun 10:59 PM CT |


