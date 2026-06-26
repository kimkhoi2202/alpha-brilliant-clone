# Brainlift — AlphaBrilliant Phase 2

> How Phase 2 was built: the AI-native **Koji** tutor (grounded hints, personalized explanations, realtime voice, app tool-control) and **verified "Infinite Practice"**, on top of the zero-AI Phase 1 engine. Subject: the Pythagorean theorem.

## 1. Tools & workflow

- **Cursor** as the editor/agent host, driving a **10-agent orchestrated swarm** (roles in `.cursor/agents/`): `ai-foundation`, `backend-functions`, `tools`, `tutor-text`, `voice`, `generation`, `reveal-pedagogy`, `ui-animation`, `code-reviewer`, `qa-swarm-lead`.
- **Disjoint ownership + git worktrees.** Each agent owned one slice and worked in a sibling worktree under `alpha-brilliant-clone/`, on a feature branch, merged by PR into the stacked integration branches: `phase-2/problem-generation` → `phase-2/koji-tutor` → `phase-2/ai-features`. Cross-agent contracts were pinned in code (the callable request/response types in `functions/src/index.ts` mirror `src/lib/ai/client.ts`) so parallel work composed without collisions.
- **Ralph-style looping.** `RALPH_TASK.md` defines a binary Done-bar (both pillars, AI-never-wrong, AI-off-safe, green `tsc`/`eslint`/`build`, UI bar); the loop iterates until every box is true rather than stopping at "looks done".
- **Multi-pass review cadence.** Code review re-reviews after fixes until explicit APPROVE; **Emil** design/animation runs ≥3 passes; the **impeccable-swarm** UI/UX QA runs partition→inspect→fix→re-verify loops; **ponytail** complexity passes (`ponytail-review` per diff, `ponytail-audit` before promotion) cut over-engineering. The git history shows this directly (e.g. `merge(fix): backend review fixes`, `refactor(functions): ponytail safe cuts`, `style(ui): Emil … pass 1`).

## 2. Prompting strategies that worked

1. **Grounded-state tool briefs.** Every agent was told to build prompts from *typed state* (`ProblemStep` + `AnswerValue` + `StepRecord`) serialized as compact JSON — never scraped DOM/KaTeX. This kept prompts small, cheap, and correct (`src/lib/ai/grounding.ts`).
2. **"Verify with the engine; the model only phrases."** Ground truth is `correctAnswer()`/`gradeStep()` + `math.js`. Generated problems must pass a `gradeStep(correctAnswer(step))` **round-trip** before display; reveals are engine-computed; the model is demoted to a phrasing layer (`src/lib/ai/verify.ts`).
3. **Disjoint-ownership parallel agents with explicit contracts.** Rather than one agent doing everything, each owned a file set behind a typed interface, so foundation/backend/voice/generation could be built simultaneously and merged cleanly.
4. **Don't trust the prompt — add a code backstop.** Hint prompts say "DO NOT state the value," *and* a server-side leak firewall re-checks the output and swaps in a static hint if the answer slips through (`functions/src/handlers/tutor.ts` `mentionsAnswer`, `verify.ts` `hintLeaksAnswer`). Defense in depth, not vibes.
5. **AI-off-first / additive.** Build the fallback path first: every client wrapper early-returns a safe empty result when `VITE_AI_ENABLED` is off, so no AI path can break the app.

## 3. Phase 2 decisions — shipped / skipped / deferred

| Decision | Status | Why |
| --- | --- | --- |
| **Koji grounded tutor** — progressive text hints, deterministic-diagnosis explanations, **realtime voice**, **app tool-control** (8 tools) | ✅ Shipped | The core "AI-native" ask: a tutor that *sees* lesson state and *operates* the app with the learner. |
| **Effort-gated, personalized reveal** | ✅ Shipped | Protects the learn-by-doing loop: answer is earned (genuine attempt + Koji engagement), engine-computed, marked `assisted`. |
| **Verified adaptive generation / "Infinite Practice"** | ✅ Shipped | Course never runs dry; every problem passes the verification firewall. |
| **Open web chatbot** | ❌ Skipped | Koji is grounded and tool-scoped, not a free-form chat box. |
| **AI-generated visuals / whole lessons / feedback-rewrite** | ❌ Skipped | Use the safe hand-built `VisualSpec` set and hand-written feedback (the latter *is* the AI-off fallback); generate problems *within* the proven schema, not new pedagogy. |
| **Spaced repetition / mastery scheduling / full adaptive sequencing** | ⏭ Deferred → Phase 3 | That's learning-science. Phase 2 adapts only *difficulty* inside generation. |

## 4. Code analysis — AI-generated vs hand-written

Honestly: **this build is ~entirely AI-generated and AI-orchestrated.** Effectively all shipped TypeScript/TSX in `src/lib/ai/**`, `functions/src/**`, and `src/components/practice/**` was written by the agent swarm. The human contribution was *direction and judgment*, not code: the PRD and locked decisions (`PRD-phase-2.md`), the agent role definitions and prompts (`.cursor/agents/`, `RALPH_TASK.md`), the architectural guardrails (additive flag, verification firewall, secrets server-side), and the review/merge gating. So the split is roughly **~100% AI-written code / 100% human-decided constraints** — the leverage was in framing the problem so the swarm couldn't ship something wrong.

## 5. Key learnings / spiky opinions

- **A verification firewall beats prompt engineering.** Reliability came from code that *checks* the model (round-trip grading, leak detection), not from a cleverer prompt. For a teaching product, "the AI sometimes emits a wrong answer" is a non-starter — so we deliberately demoted the model to a phrasing engine and let the pure engine decide.
- **Ground in typed state, not screen text.** Feeding the model the structured `ProblemStep`/`AnswerValue` made prompts smaller, cheaper, and far more accurate than scraping the rendered page.
- **Build AI-off first; AI is the upgrade, not the product.** Because the flag-gated app is byte-for-byte Phase 1 with AI off, the AI is never load-bearing and there's always a graceful fallback.
- **The swarm's bottleneck is review, not authoring.** Parallel agents produce code fast; the multi-pass review/ponytail cadence is what keeps quality and complexity in check — and counters the model's instinct to over-build.
