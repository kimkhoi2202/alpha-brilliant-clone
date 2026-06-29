# Landing — Motion + Design-System Consistency (Software Factory)

Date: 2026-06-28 · Branch: `landing/motion-factory` (worktree `landing-factory`)
Route under work: `/landing` (`src/routes/Landing.tsx`) · Dev server: `http://localhost:5180/landing`

## Goal

Bring the AlphaBrilliant marketing landing up to the app's own design system
("The Lit Chalkboard", see `DESIGN.md`) and add **expressive but tasteful**
motion. The landing is structurally solid (it already composes the app's real
components) but is visually inconsistent and completely static. Fix the
inconsistencies, animate it with intention, and fix any a11y / responsive / perf
bugs found along the way.

## Scope (per the user)

- **DO**: design-system consistency, expressive-but-on-brand motion, a11y /
  responsive / performance fixes, micro-polish.
- **PRESERVE**: section content, section order, and the use of the app's real
  components. Do not rewrite the product story or invent features.
- **Register**: this is the **brand** register (design IS the product) sitting
  on the app's existing **product** design system. Identity-preservation wins:
  conform to `DESIGN.md`, do not invent a new palette or typeface.

## Hard constraints (every section subagent must obey)

### Design system (`DESIGN.md`)
- Canvas is charcoal `#141414` (`bg-background`); never pure black.
- Cards cap at `rounded-2xl` (16px). **Replace every `rounded-3xl` with `rounded-2xl`.**
- **Flat by default.** Remove heavy ambient drop shadows
  (`shadow-[0_30px_80px_-40px_...]` etc). Separate surfaces with the tonal step
  (`bg-[var(--surface)]`) + the 2px hairline (`border-2 border-border`). The only
  resting shadow is the CTA's 3D lip (already in `Button`).
- One typeface (Outfit). Hierarchy from weight/size only. `tabular-nums` on math/numbers.
- Functional color only: `--accent` (brand blue), `--warning` (gold), `--success`
  (green), `--streak` (pear). Never decorative. Primary CTA is white-on-charcoal;
  brand blue is the course/"Start" accent — both already provided by `Button`.
- Use design tokens (`var(--…)`, `text-foreground`, `text-muted`, `border-border`),
  not hardcoded hex.
- **Remove the per-section `Eyebrow`/`eyebrow=` kicker.** It appears on 8/10
  sections — that is the AI-grammar tell both `DESIGN.md` and impeccable flag. The
  headline carries the section. (Drop the `eyebrow` prop / `<Eyebrow>`; keep all
  other copy.)
- Bans: no gradient text (`bg-clip-text`), no side-stripe borders, no glassmorphism
  as decoration, no nested cards.

### Motion (impeccable `animate.md` + Emil `animations.md` + Motion `react.md`)
- **The #1 slop tell is identical fade-and-rise on every scrolled section.**
  Each section gets a DISTINCT treatment that fits what it reveals (see per-section
  plan). Never copy the same entrance everywhere.
- Import from `motion/react` (never `framer-motion`).
- Animate **transform + opacity** (and bounded blur/glow/clip where it clearly
  wins). Never animate `width`/`height`/`top`/`left`/margins.
- Exponential **ease-out** curves only (use `src/landing/motion`). No bounce, no
  elastic. Durations: micro 100–150ms, state 200–300ms, reveals 500–800ms.
  Exits ~75% of enter.
- **Reduced motion is non-negotiable.** Use the foundation's `useMotionEnabled()`
  / `useReducedMotion()`; reduced-motion renders the final state instantly (no
  transform), content always visible.
- Reveals enhance an already-visible default; never gate content visibility behind
  a never-firing transition. Use the foundation (`once: true`).
- Don't re-animate the `Button` press (it already has the tactile 3D lip).
- Respect components that own their motion (`RearrangementProof`, `KojiMascot`
  Rive, HeroUI `Accordion`, `Meteors`, `ProgressBar`). Orchestrate around them;
  don't fight them.

### Accessibility / quality (Emil + impeccable `audit.md`)
- No layout shift from animation or dynamic numbers (`tabular-nums`, reserved height).
- 44px min tap targets; hover effects behind `@media (hover: hover)` where added.
- Keep existing `aria-*`, `aria-live`, roles, focus states. Icon-only controls keep labels.
- Body text contrast ≥ 4.5:1 on charcoal (don't lighten muted text further).
- 60fps; `will-change` only on the animating element, never page-wide.

## Shared motion foundation — `src/landing/motion/` (OWNED BY ORCHESTRATOR)

Section subagents IMPORT from here and **must not edit these files**. If you need a
one-off effect, implement it locally inside your own section file.

- `tokens.ts` — `easing` (ease-out curves as bezier arrays), `duration`, `spring`,
  `viewportOnce` / `viewportEarly` defaults.
- `use-motion-enabled.ts` — `useMotionEnabled()` (false on `prefers-reduced-motion`
  or `?motion=off` QA escape).
- `reveal.tsx` — `<Reveal>` (fade + rise, configurable `y`/`delay`/`amount`/`as`),
  `<Stagger>` + `<StaggerItem>` (legitimate list/grid choreography), and the
  exported `revealUp`, `staggerContainer`, `staggerItem` variants for use directly
  on `motion.ul`/`motion.li` when a wrapper div would break a grid.
- `use-parallax.ts` — `useParallax(ref, { distance })` (scroll-linked translate via
  `useScroll`+`useTransform`, allocation-free) and `useScrollProgress`.
- `count-up.tsx` — `<CountUp value/>` (tabular-nums, in-view once, reduced-motion →
  final value). Optional; use only where a number genuinely benefits.

### File boundaries for the factory
- Section subagents edit **only their one file** in `src/landing/sections/`.
- Off-limits (orchestrator-owned): `src/landing/motion/**`, `src/landing/ui/section.tsx`,
  `src/landing/ui/scroll-to-id.ts`, `src/routes/Landing.tsx`.

## Per-section plan (distinct motion + the concrete fixes)

1. **hero.tsx** — *Signature first-load choreography.* Headline rises in (line
   stagger), then subhead → CTAs → trust badges; the playground card settles in
   just after. Subtle parallax on the graph-paper field on scroll. One-time
   "build" of the triangle squares on mount if cheap. Fixes: `rounded-3xl`→`2xl`,
   drop the heavy shadow.
2. **how-it-works.tsx** — *Directional, alternating reveal.* Text and visual enter
   from opposite sides to match the alternating rows (converging), not a uniform
   fade-up. The `ChapterProgressVisual` bar should fill **when the step enters view**
   (not on mount). Already uses `rounded-2xl` — keep. Drop the eyebrow.
3. **interactive-proof.tsx** — *Auto-demo on view.* Cards rise in; when the proof
   enters the viewport, auto-trigger `RearrangementProof`'s morph once (if motion
   enabled) so visitors SEE it click without pressing (check the component's API
   first; if no trigger prop, leave its play control and just reveal). Equation can
   assemble. Fixes: `rounded-3xl`→`2xl` (×2), drop heavy shadows, drop eyebrow.
4. **features.tsx** — *Bento stagger + demo crossfade.* Stagger the bento tiles
   (legitimate grid list, cap ~500ms total); Koji focal tile gets a slightly
   stronger entrance + glow bloom. Crossfade/slide between the drag/count/plot/
   rearrange demos via `AnimatePresence`. Already `rounded-2xl`. Drop eyebrow.
5. **koji.tsx** — *Conversational unfold.* The thread rows appear in sequence
   (header → nudge → hint chips → callout → voice → reveal), like a chat arriving.
   Mascot glow breathes subtly. Fixes: `rounded-3xl`→`2xl`, drop heavy shadow,
   `border`→`border-2`, drop eyebrow.
6. **course-path.tsx** — *Path draws / pucks light up.* Lesson pucks reveal in
   sequence; the medallion ring animates its progress on view. Fixes:
   `rounded-3xl`→`2xl` (×2), drop heavy shadow, drop eyebrow.
7. **social-proof.tsx** — *Stagger + check-draw.* Outcome cards stagger in; the
   accent check-dots draw their stroke. Capstone card emphasized last. Already
   `rounded-2xl`. Drop eyebrow.
8. **pricing.tsx** — *Price-change motion + timeline draw.* Plan cards reveal
   (Premium gets a one-time accent glow); animate the price number on billing
   toggle (`AnimatePresence` slide/fade); stagger `PaywallComparison` rows and draw
   the `TrialTimeline`. Already `rounded-2xl`. Drop eyebrow.
9. **faq.tsx** — *Restrained.* Subtle stagger of the accordion rows on view; let
   HeroUI's accordion own the expand/collapse. Don't over-animate (read often).
   Drop eyebrow.
10. **final-cta.tsx** — *Climactic band.* Stronger entrance for the accent band
    (scale-in + glow bloom); keep/lean on the existing `Meteors` as ambient motion.
    Fixes: `rounded-3xl`→`2xl`, soften the heavy shadow to the band's own glow.
11. **footer.tsx** — *Restraint.* Keep link hover only; no entrance choreography.

## Factory process

0. **Foundation** (orchestrator): build `src/landing/motion/**`, typecheck, commit.
1. **Section factory**: dispatch subagents in batches (≤4 at a time), one section
   each, each reads this spec + `DESIGN.md` + the relevant impeccable/Emil/Motion
   rules, edits only its file. After each batch: `tsc` + `eslint` on the batch.
2. **QA swarm** (impeccable-swarm): read-only browser inspection per section
   (desktop+mobile screenshots, console, axe, layout), score vs the bar; fix until
   it passes.
3. **Verify**: `pnpm build` + `pnpm lint` clean; full-page browser QA; before/after.

## Pass bar (QA)
- Build + lint clean. No console errors. No runtime errors.
- Each section: design-system consistent, distinct on-brand motion, reduced-motion
  verified, responsive (no overflow at 375 / 768 / 1280), a11y intact.
- The page does not read as "AI made that": no uniform fade-up, no eyebrow grammar,
  no over-rounding, flat-by-default surfaces.
