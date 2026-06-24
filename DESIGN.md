---
name: AlphaBrilliant
description: Learn-by-doing geometry — the Pythagorean Theorem on a dark, tactile canvas.
colors:
  brand-blue: "#456dff"
  link-blue: "#7491ff"
  streak-pear: "#b5e853"
  correct-green: "#5ed981"
  retry-gold: "#f9d25c"
  error-red: "#ff8585"
  canvas: "#141414"
  nav: "#1e1e1e"
  surface: "#1c1c1e"
  surface-raised: "#232326"
  surface-overlay: "#2a2a2e"
  control: "#29292d"
  ink: "#ffffff"
  ink-inverse: "#0a0a0b"
  muted: "#ffffff99"
  border: "#ffffff33"
  border-hover: "#ffffff66"
  feedback-correct-panel: "#00370f"
  feedback-retry-panel: "#403000"
  feedback-incorrect-panel: "#383838"
typography:
  display:
    fontFamily: "Outfit Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Outfit Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Outfit Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Outfit Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Outfit Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ink-inverse}"
    rounded: "{rounded.full}"
    padding: "12px 28px"
  button-primary-hover:
    backgroundColor: "#e9e9eb"
    textColor: "{colors.ink-inverse}"
  button-accent:
    backgroundColor: "{colors.brand-blue}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "12px 28px"
  button-ghost:
    backgroundColor: "#00000000"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  answer-choice:
    backgroundColor: "#00000000"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  answer-choice-selected:
    backgroundColor: "#456dff26"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  answer-choice-correct:
    backgroundColor: "#5ed98126"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  course-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  callout-info:
    backgroundColor: "#456dff1f"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: AlphaBrilliant

## 1. Overview

**Creative North Star: "The Lit Chalkboard"**

AlphaBrilliant is a dark slate surface where each idea lights up the moment you
touch it. The canvas is a deep, distraction-free charcoal (`#141414`) — not pure
black — and everything that matters earns its glow against it: the blue you drag,
the green that confirms, the gold that says "almost," the lime bolt that marks a
streak. Color is rare and functional, never decorative wallpaper. The system is
**focused and dark** first: one screen, one idea, nothing competing for the
learner's attention while they manipulate a triangle until the theorem clicks.

The feel is **tactile and confident**. Primary actions are solid, chunky, and
physically responsive — they carry a subtle 3D lip that compresses when pressed,
so a tap feels like pressing a real key. Type is a single geometric sans (Outfit)
in a tight scale; hierarchy comes from weight and size, never from a second
typeface or a decorative flourish. Depth is mostly implied through tonal layering
and hairline borders rather than heavy shadows.

This system explicitly rejects the textbook and the lecture hall. It must never
read like **a page to study** — walls of text, dense paragraphs, a formula stated
then drilled. It must never feel like **a video to watch passively**. Wrong
answers are never a **bare red X**. And it avoids the **generic ed-tech template**
look: stock illustrations, hero-metric dashboards, and one-size course-card grids
that could belong to any subject.

**Key Characteristics:**
- Charcoal canvas (`#141414`), dark-only, distraction-free.
- One typeface (Outfit Variable); weight and size create all hierarchy.
- Rare, functional color — each hue means something (brand / streak / status).
- Tactile primary actions with a 3D press-down lip.
- Flat by default; hairlines and tonal steps do the separating.

## 2. Colors

A near-monochrome charcoal field on which a small set of saturated, meaning-bearing
accents light up. Every color carries a job; nothing is on screen for decoration.

### Primary
- **Brand Blue** (`#456dff`): The course/brand accent — the "Start" button, the
  selected answer's edge and tint, focus rings on inputs. The single hue that says
  "this is AlphaBrilliant."
- **Link Blue** (`#7491ff`): The lighter blue reserved for inline text links, so
  links stay legible against charcoal without using the heavier brand fill.

### Secondary
- **Streak Pear** (`#b5e853`): The lime-gold streak bolt and streak energy only.
  Its scarcity is the point — it appears when momentum is on the line, nowhere
  else.

### Tertiary
Status colors, used only as feedback — never as branding.
- **Correct Green** (`#5ed981`) over panel **`#00370f`**: A right answer.
- **Retry Gold** (`#f9d25c`) over panel **`#403000`**: A retryable "almost."
- **Error Red** (`#ff8585`): Destructive or hard-error states (sparingly).

### Neutral
- **Canvas** (`#141414`): The app background. The charcoal the whole system sits on.
- **Nav** (`#1e1e1e`): The top bar, lifted a hair off the canvas.
- **Surface / Raised / Overlay** (`#1c1c1e` / `#232326` / `#2a2a2e`): A three-step
  tonal stack for cards, panels, and popovers — depth by tone, not shadow.
- **Control** (`#29292d`): Neutral control fills (the grey "Why?" pill, disabled
  buttons, segmented-control tracks).
- **Ink** (`#ffffff`) / **Ink Inverse** (`#0a0a0b`): Primary text on dark; near-black
  text on the white primary CTA.
- **Muted** (`#ffffff99`, white α0.6): Secondary text and icons.
- **Border / Border Hover** (`#ffffff33` / `#ffffff66`, white α0.2 → α0.4): The
  hairline that does most of the separation work; brightens on hover.

### Named Rules
**The Inverse-CTA Rule.** The primary action is **white-on-charcoal**, not the
brand hue. Blue is the course/brand accent (Start, links, selection); it is never
the default primary-button fill.

**The Charcoal-Not-Black Rule.** The canvas is `#141414`. Never pure `#000`.

**The Meaningful-Color Rule.** Green, gold, red, and pear are *signals*. Never use
a status color as decoration or a brand color as a status.

## 3. Typography

**Display Font:** Outfit Variable (with `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Outfit Variable (same family)
**Label/Mono Font:** Outfit Variable; a mono stack appears only for tiny dev/utility labels.

**Character:** One clean, geometric sans across the entire app — friendly and
contemporary, in the spirit of Brilliant. Because there's a single family,
hierarchy is built entirely from weight (400/500/600/700) and size.

### Hierarchy
- **Display** (700, `3rem` / text-5xl, line-height 1.05, tracking -0.025em): Big
  moments — celebration screens, hero numbers.
- **Heading 1 / Headline** (600, `1.875rem` / text-3xl, tracking -0.025em): Screen
  titles (e.g. "Component Library", course-map header).
- **Heading 2 / Title** (600, `1.5rem` / text-2xl): Section and card titles.
- **Title (large)** (600, `1.125rem` / text-lg): Sub-section labels, dialog titles.
- **Body** (400, `1rem` / text-base, line-height 1.5): Lesson prose and primary
  reading text. Cap measure at 65–75ch.
- **Small / Label** (500, `0.875rem` / text-sm, often `muted`): Captions, helper
  text, counts, nav tabs.

### Named Rules
**The One-Typeface Rule.** Outfit carries the whole system. Never introduce a
second family for "contrast" — change weight or size instead.

**The Tabular-Math Rule.** Numerals and equations use `tabular-nums` and tight
tracking so `a² + b² = c²` and `3² + 4² = 5²` stay aligned and crisp.

## 4. Elevation

The system is **flat by default**. Surfaces separate through a three-step tonal
stack (`#1c1c1e` → `#232326` → `#2a2a2e`) above the `#141414` canvas plus a white
hairline border (α0.2), not through ambient drop shadows. Shadow is reserved for
two jobs: the tactile press on primary actions, and genuinely floating overlays
(search popover, menus).

### Shadow Vocabulary
- **CTA lip** (`box-shadow: 0 3px 0 0 color-mix(in srgb, var(--button-bg), #000 14%), 0 5px 8px -5px rgba(0,0,0,0.5)`):
  The resting 3D edge under a filled "clicky" button. Collapses to
  `0 2px 4px -4px rgba(0,0,0,0.5)` with a `translateY(3px)` on press.
- **Nav float** (`box-shadow: 0 1px 10px rgba(0,0,0,0.18)`): The top bar's faint
  lift off the canvas.
- **Overlay** (`shadow-2xl` tinted `black/60`): Floating popovers, dialogs, menus.
- **Inset hairline** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.02)`): The
  faint top-edge sheen on callouts.

### Named Rules
**The Flat-Until-Pressed Rule.** Surfaces are flat at rest; the only resting
shadow is the CTA's 3D lip, and its whole job is to collapse when pressed.

## 5. Components

### Buttons
- **Shape:** Pill by default (`rounded-full`); square-ish controls (icon buttons)
  use `rounded-lg` (8px).
- **Primary:** White fill (`#ffffff`) with near-black text (`#0a0a0b`) — the
  high-contrast "Check / Continue / Sign in" CTA. Padding ~`12px 28px`.
- **Accent:** Brand blue (`#456dff`) with white text — the course "Start."
- **Status:** `success` / `warning` / `danger` mirror the same solid shape in their
  status hues with near-black text.
- **Clicky (default on filled CTAs):** Carries the 3D lip (see Elevation) and
  presses down 3px on `:active`.
- **Hover / Active:** Brilliant's signature — the whole control dims uniformly
  (opacity → 0.85 hover, 0.7 active), no hue shift. Transitions: transform &
  box-shadow ~90ms, opacity ~130ms.
- **Ghost / Outline:** Flat (no lip), hairline or transparent, for secondary
  actions.
- **Disabled:** Renders as a flat control-grey fill (`#29292d`) with muted text —
  not a faded version of the live color.

### Answer Choice (signature)
- **Style:** Outlined, not filled. Default is transparent with a hairline border
  (`#ffffff33`) that brightens and tints to `surface` on hover. Radius `rounded-xl`
  (12px), padding `14px 16px`, medium weight.
- **States:** `selected` = brand-blue border + inset 1px ring + ~15% blue tint
  (a clean edge, no outer glow). `correct` = green equivalent; `incorrect` = gold
  equivalent. Correct/incorrect add a small circular ✓/✕ badge at the top-right.
- **Rule:** Feedback never relies on color alone — the ring/tint is always paired
  with a badge or icon.

### Callout
- **Style:** A **full** hairline border + a low-alpha tinted background + a round
  icon chip. Intents: `info` (blue), `warning` (gold), `danger` (red), `neutral`.
  Radius `rounded-2xl` (16px), padding `16px`, faint inset top sheen.
- **Note:** This is deliberately a full-border card, **not** a side-stripe alert.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (16px) — the ceiling for cards.
- **Background:** Canvas (`#141414`) or a `surface` step; lifts to `surface` on
  hover when interactive.
- **Border:** 2px hairline (`#ffffff33`).
- **Shadow Strategy:** None at rest (see Elevation — flat by default).
- **Internal Padding:** `24px` (course card); `16px` for denser cards.

### Inputs / Fields
- **Style:** Pill (`rounded-full`) with a 2px hairline border on the canvas fill.
- **Focus:** Border shifts to brand blue (`#456dff`); the default focus outline is
  removed in favor of the border shift. Placeholder text uses `muted`.
- **Disabled:** Control-grey fill, muted text.

### Navigation
- **Style:** Sticky top bar on the `nav` surface (`#1e1e1e`) with a bottom hairline
  and a faint float shadow; 64px tall, max-width 6xl.
- **Tabs:** `text-sm`; inactive `muted`, active `foreground` + medium weight. The
  active/hover indicator is a **sliding underline** that parks just below the bar
  and slides up (faint on hover, solid when selected), ~150ms ease-out.
- **Mobile:** Center tabs hide below `sm`; brand + end-cluster remain.

### Streak Bolt (signature)
- A small inline-SVG lightning "pear." Filled lime (`#b5e853`) when today's streak
  is done; hollow (canvas fill, `muted` 2px stroke) when at-risk. The large
  in-lesson "streak achieved" celebration is a separate Rive animation.

## 6. Do's and Don'ts

### Do:
- **Do** keep the canvas at charcoal `#141414` and let saturated accents carry
  meaning against it.
- **Do** make the primary CTA white-on-charcoal; reserve brand blue for course
  "Start," links, and selection.
- **Do** keep the 3D "clicky" lip on filled CTAs and let it collapse on press —
  the tactility is the brand.
- **Do** build hierarchy with Outfit's weight and size; use `tabular-nums` for math.
- **Do** pair every correct/incorrect state with a badge or icon, never color alone.
- **Do** give every animation a `prefers-reduced-motion` fallback (the button
  system already does — hold new motion to that bar).
- **Do** cap card radius at 16px (`rounded-2xl`).

### Don't:
- **Don't** ship a screen that reads like a **textbook page** — walls of text,
  dense paragraphs, a formula stated then drilled.
- **Don't** fall back on the **lecture-video** pattern: passive watching, "now you
  try" only at the end.
- **Don't** mark a wrong answer with a **bare red X** and no explanation — every
  wrong answer gets a specific, useful nudge.
- **Don't** reach for the **generic ed-tech template**: stock illustrations,
  hero-metric dashboards, identical one-size course-card grids.
- **Don't** use a **side-stripe border** (`border-left`/`right` > 1px as a colored
  accent) — callouts use full borders + tints.
- **Don't** use **gradient text** (`background-clip: text`). The iridescent
  blue→pink→gold gradient is for the brand mark/accents only, never type.
- **Don't** introduce a second typeface or a new accent hue "for contrast."
- **Don't** over-round (no 24px+ radii on cards) or stack heavy drop shadows where
  a hairline + tonal step will separate surfaces.
- **Don't** use pure black `#000` for the canvas.
