# AGENTS.md — AlphaBrilliant

Persistent context and conventions for AI agents and contributors working in this repo.

## Project

AlphaBrilliant is a **learn-by-doing geometry app** (the Pythagorean Theorem), modeled on Brilliant, built deep for one chapter and one persona (a high-school student). See [`PRD-phase-1.md`](./PRD-phase-1.md) for the full spec.

- **Stack:** React 19 + TypeScript + Vite; Firebase (Auth: email/password + Google · Cloud Firestore · Hosting). Firebase project: `fir-94b95`.
- **Build philosophy:** **platform first** — build and prove the content model, lesson renderer, interaction components, feedback engine, progress/path, streak, auth, and persistence with **placeholder lessons**; author real content later. **No AI in Phase 1.**

## Project structure (intended)

```
src/
  main.tsx                 # entry; mounts providers + router
  App.tsx                  # top-level routes / shell
  lib/                     # firebase.ts, AuthContext.tsx, helpers
  content/                 # content model: types + lesson definitions + course path
  components/
    interactions/          # mc, numeric, tap, slider, plot-points, drag-arrange
    visuals/               # SVG figures: right triangle, squares-on-sides, grid, proof
    ui/                    # shared UI (buttons, cards, layout, feedback banner)
  routes/                  # AuthScreen, CourseMap, LessonPlayer, Profile
  hooks/                   # useProgress, useStreak, useAuth
```

**Renderer vs. content:** `LessonPlayer` reads a `Lesson` from `content/` and renders each `Step` via the matching `interactions/` + `visuals/` component. **Adding a lesson is adding data, not UI.**

## Repository layout (worktrees)

```
alpha-brilliant-clone/            # container (worktrees live here)
├── Archived/                     # old project docs (outside the repo)
├── main/                         # this repo — the `main` worktree
└── phase-1-mvp/  (etc.)          # sibling worktrees for phase branches
```

Phase work is done in a sibling worktree, e.g.:

```bash
git worktree add ../phase-1-mvp phase-1/mvp
```

## Git workflow

### Environment branches (long-lived)

| Branch | Purpose |
| --- | --- |
| `dev` | Active development integration |
| `staging` | Pre-production QA |
| `main` | Stable / release candidate (default branch) |
| `prod` | Production — the deployed app (Firebase Hosting) |

Changes promote **one way only**: `dev → staging → main → prod`.

### Phase branches

- `phase-1/mvp`, `phase-2/ai-features`, `phase-3/learning-science`.
- Naming convention: `<phase>/<topic>`.
- Branch phase work **off `dev`**; merge back **into `dev`** via PR. (Finer feature branches may be cut off a phase branch.)

### Rules

- **Never force-push** shared branches (`dev`, `staging`, `main`, `prod`).
- Promote between environment branches via **PRs**, in order; `prod` only ever receives what was promoted from `main`.
- Keep commits focused; use conventional-style messages (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Deploy to Firebase Hosting from `prod`.

### PR / promotion checklist

- [ ] `pnpm build` is green (type-check + production build).
- [ ] `pnpm lint` passes.
- [ ] Verified on a phone-sized viewport.
- [ ] No secrets added; Firestore rules still scope users to their own subtree.
- [ ] PR targets the **next** branch in the promotion order.

## Dev commands

```bash
pnpm install          # install deps
pnpm dev              # local dev server (http://localhost:5173)
pnpm build            # tsc -b && vite build
pnpm preview          # preview the production build
pnpm lint             # eslint

pnpm build && npx firebase deploy   # deploy to Firebase Hosting (from prod)
```

## Adding a lesson

1. Add a `Lesson` object in `src/content/` (id, title, `conceptSummary`, ordered `steps`).
2. For each `problem` step, set the `interaction`, a pure `validate` rule, and **hand-written** `feedback` (a `correct` line + targeted `hints` + a `default` explanation).
3. Register the lesson in the course path (order/unlock).
4. The renderer handles the rest — do **not** hard-code lesson UI.

## Testing & QA

- No automated test suite is required for the MVP; QA is manual against the **MVP Test Plan** in `PRD-phase-1.md` §1.9.
- Always sanity-check: complete a lesson, **get answers wrong on purpose** (feedback must help), leave mid-lesson and resume, confirm streak persists, and run it on a phone viewport.
- **Performance budgets:** feedback `< 100ms` (validation is pure + client-side — never block on the network), interactive visuals `60fps`, first interaction `< 2s`.

## Definition of Done (per feature)

- [ ] Builds clean (`tsc` + `vite build`) and lints.
- [ ] Works on mobile (touch + small screens).
- [ ] Relevant state persists to Firestore under `users/{uid}/**`.
- [ ] Feedback is instant and specific; wrong answers teach.
- [ ] No AI used in Phase 1.

## Conventions

- **TypeScript strict; no `any`.**
- **Lessons are data:** authored in the content model (`src/content/`) and rendered by a generic renderer — never hard-code a lesson as bespoke HTML.
- **Feedback is pure + client-side** (`< 100ms`); never depend on the network to check an answer.
- **Firestore:** each user owns `users/{uid}/**` only (see `firestore.rules`); scope all reads/writes to the signed-in user.
- **Mobile-first**, SVG visuals, pointer events for touch, target 60fps.
- Firebase web config in `src/lib/firebase.ts` is a public client identifier — security is enforced by rules, not by hiding it.
```
