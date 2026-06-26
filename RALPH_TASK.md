---
task: Ship AlphaBrilliant Phase 2 (AI-native Koji tutor + verified generation), world-class, end-to-end.
integration_target: phase-2 branches ONLY (phase-2/koji-tutor, phase-2/problem-generation -> phase-2/ai-features). NEVER main/prod.
hosting: Firebase (unchanged)
loop: iterate until the Done-bar is fully met
---

## Goal

Build Phase 2 exactly as specified in `PRD-phase-2.md`, to a world-class bar, with a 10-agent team working like a real org (worktrees, feature branches, PRs, review, autonomous merge into the phase-2 integration branch, rebases as needed).

## Done-bar (Ralph exits ONLY when ALL are true)

- [ ] **Pillar A — Koji tutor:** progressive text hints; personalized, **effort-gated** reveal (genuine attempt + Koji engagement required); **realtime voice** (tap-to-talk + optional hands-free, live transcript, warm voice); **app tool-control**; all grounded in typed lesson state.
- [ ] **Pillar B — generation:** verified adaptive problem generation + a single **"Infinite Practice"** mode; every generated problem passes `gradeStep(correctAnswer())`.
- [ ] **AI never emits a wrong answer:** generation + reveals are engine/`math.js`-verified; hints never leak the answer.
- [ ] **AI-off safe:** `VITE_AI_ENABLED=false` ⇒ byte-for-byte the Phase 1 experience; still teaches end-to-end.
- [ ] **Quality gates green:** `tsc`, `eslint`, `vite build`; no console errors; functions build clean.
- [ ] **UI bar:** impeccable-swarm pass (critique ≥ 32/40, audit ≥ 16/20, AI-slop = pass, 0 P0/P1) + **Emil** design/animation polish; consistent with the design system (HeroUI v3 / Tailwind v4 / brilliant-theme).
- [ ] **No known P0/P1 bugs; smooth at 60fps; mobile-first.**

## Constraints

- Ground every AI feature in structured state; verify with the pure engine + `math.js`.
- Secrets server-side (Cloud Functions); never in the client bundle.
- Conventional commits; one PR per feature branch into the phase-2 integration branch; **reviewed before merge**.
- All worktrees live under `alpha-brilliant-clone/`.
- Do not touch `main`/`prod`. Do not break the AI-off path.

## Review cadence (multi-pass — required)

Single-pass is NOT enough. Each review-heavy discipline iterates until it clearly clears the bar:

- **Design (Emil):** at least **3 passes** — build/polish → design critique (score each dimension against Emil's `reference/critique.md` + `audit.md`) → refine → re-critique — looping until it clearly *exceeds* the bar, not merely meets it.
- **UI/UX QA (impeccable-swarm):** run the **full loop with multiple iterations** (partition → inspect → fix → re-verify), never a single inspection. Stop only when every slice passes (critique ≥ 32/40, audit ≥ 16/20, AI-slop = pass, 0 P0/P1) on a *re-verified* run.
- **Code review:** **re-review after fixes** (review → fix → re-review) until an explicit APPROVE — not one-and-done.
- Applies to **every phase** (including Phase 3).
