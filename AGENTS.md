# AGENTS.md — AlphaBrilliant

Persistent context and conventions for AI agents and contributors working in this repo.

## Project

AlphaBrilliant is a **learn-by-doing geometry app** (the Pythagorean Theorem), modeled on Brilliant, built deep for one chapter and one persona (a high-school student). See [`PRD.md`](./PRD.md) for the full spec.

- **Stack:** React 19 + TypeScript + Vite; Firebase (Auth: email/password + Google · Cloud Firestore · Hosting). Firebase project: `fir-94b95`.
- **Build philosophy:** **platform first** — build and prove the content model, lesson renderer, interaction components, feedback engine, progress/path, streak, auth, and persistence with **placeholder lessons**; author real content later. **No AI in Phase 1.**

## Repository layout

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

## Dev commands

```bash
pnpm install          # install deps
pnpm dev              # local dev server (http://localhost:5173)
pnpm build            # tsc -b && vite build
pnpm preview          # preview the production build
pnpm lint             # eslint

pnpm build && npx firebase deploy   # deploy to Firebase Hosting
```

## Conventions

- **TypeScript strict; no `any`.**
- **Lessons are data:** authored in the content model (`src/content/`) and rendered by a generic renderer — never hard-code a lesson as bespoke HTML.
- **Feedback is pure + client-side** (< 100ms); never depend on the network to check an answer.
- **Firestore:** each user owns `users/{uid}/**` only (see `firestore.rules`); scope all reads/writes to the signed-in user.
- **Mobile-first**, SVG visuals, pointer events for touch, target 60fps.
- Firebase web config in `src/lib/firebase.ts` is a public client identifier — security is enforced by rules, not by hiding it.
