# Phase-3 Handoff — AlphaBrilliant

> Paste this into a new chat opened with **Coding Projects** as the workspace, or just tell the new agent to read this file.

## Who/what this is
AlphaBrilliant: a learn-by-doing geometry app (Pythagorean Theorem), modeled on Brilliant. Built deep for one chapter + one persona (high-school student).
Stack: React 19 + TypeScript + Vite · Firebase (Auth email/password+Google, Cloud Firestore) · **deployed on Vercel** (frontend + serverless `api/`) · OpenAI for the "Koji" AI tutor (text + realtime voice) and verified "Infinite Practice" problem generation.

## Where to work (IMPORTANT)
- This new chat is rooted at **`Coding Projects`** (the broad folder), on purpose.
- Do **Phase 3** work inside the worktree: **`alpha-brilliant-clone/phase-3/`** on branch **`phase-3/learning-science`** (currently at commit `2ea5ec2`).
- That worktree is ready: deps installed (`pnpm install` done), and `.env`, `.env.local`, `.vercel` are present, so `pnpm dev/build` and `vercel` all work there.
- **Do NOT disturb `alpha-brilliant-clone/main/`** — it holds the frozen Phase-2 snapshot (branch `landing/marketing` @ `2ea5ec2`).

## Git state (repo: github.com/kimkhoi2202/alpha-brilliant-clone, public, default `main`)
- Tags (both on GitHub):
  - `v1.0-phase-1-mvp` → `e464e12`
  - `v2.0-phase-2-ai-features` → `2ea5ec2` (the Phase-2 snapshot — "Frozen before Phase 3")
- Branches at `2ea5ec2` (pushed): `phase-2/ai-features`, `phase-2/koji-tutor`, `phase-3/learning-science`, `landing/marketing`.
- Env branches `dev`/`main`/`staging`/`prod` + `phase-1/mvp` are all still at `e464e12` (Phase 1). They were intentionally NOT promoted — and they do NOT drive deployment (see below).
- Worktrees (all one repo, under `alpha-brilliant-clone/`): `main`, `phase-3`, `phase-1-pr`, plus `impeccable-swarm-qa`, `impeccable-ui-fixes`, `wt-qa`, `wt-voice`.

## Deployment reality (AGENTS.md is STALE on this)
- Deploys are **manual via the Vercel CLI** (`vercel` = preview, `vercel --prod` = production). It is **not** Git-connected — pushing to GitHub deploys nothing.
- Vercel project `main` (team `kimkhoi2202s-projects`). Live production: **https://main-alpha-pink.vercel.app**.
- AI backend = Vercel serverless functions: `api/chat`, `api/generate`, `api/realtime-token`, `api/tutor`.
- `AGENTS.md` still documents the OLD Firebase Hosting + `dev→staging→main→prod` flow — that is legacy/incorrect now. Treat Vercel-CLI as the real deploy path.

## Phase-2 snapshot — what was just captured (4 commits)
`166bb0e` AI backend (Vercel functions) + Koji client/tools/voice · `85357b0` Koji in-lesson UI redesign + lesson/chrome polish · `7930f5b` marketing landing · `2ea5ec2` QA harness + PRD + assignment brief + config.
Verified: `pnpm build` ✅ and `pnpm lint` ✅ both clean at the snapshot.

## Phase 3 goal — Learning Science (due Sunday)
Layer evidence-based techniques on top of the working app (see `ASSIGNMENT-BRIEF.pdf` "Phase 3"). Candidates: retrieval practice, spaced repetition (resurface wrong answers sooner), interleaving, mastery learning (real mastery gate), scaffolding + desirable difficulty, sharper explanatory feedback. Pick a few, implement for real (grounded in the content model + mastery layer), and document in `Brainlift.md`. The app must still teach with AI off.

## Open items (not yet done)
1. Publish the v2.0 snapshot to production: `vercel --prod` (live is currently behind the snapshot).
2. Fix stale `AGENTS.md` (Firebase → Vercel; clarify whether the `dev→…→prod` git convention still applies now that deploys are CLI).
3. Optional cleanup: ~13 merged local-only `phase-2/*` feature branches can be deleted.

## Key docs (in both `main/` and `phase-3/`)
`ASSIGNMENT-BRIEF.pdf` (source spec), `PRD-phase-1.md`, `PRD-phase-2.md`, `PRD.md`, `PRODUCT.md`, `DESIGN.md`, `Brainlift.md`, `DEMO-SCRIPT.md`, `README.md`, `AGENTS.md` (note: stale deploy section).
