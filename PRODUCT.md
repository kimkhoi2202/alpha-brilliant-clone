# Product

## Register

product

## Users

A 9th/10th-grade student meeting (or revisiting) right triangles for the first
time — often on their own, sometimes on a phone, with a few spare minutes rather
than a study hall block. Their context is short-session and self-directed: no
teacher in the room, no syllabus pressure, just "I want this to finally make
sense." The job to be done is **understand the Pythagorean Theorem well enough to
use it with confidence** — not memorize a formula, but feel why `a² + b² = c²` is
true and know when to reach for it.

## Product Purpose

AlphaBrilliant teaches **one chapter deeply** — Geometry → the Pythagorean
Theorem — through hands-on, interactive problems: drag a right triangle, plot
points on a grid, rearrange four triangles into a proof. Each idea is something
you *do* first and *name* second, with instant, specific feedback on every
answer. It exists because the default ways students meet this theorem (a textbook
page, a lecture video) ask them to absorb rather than act, and absorption is
where the concept slips. Success looks like a learner finishing the five-lesson
path with real mastery, a streak worth protecting, and the sense that the next
chapter is approachable too — measured by lesson completion, return visits, and
mastery rolled up per concept.

## Brand Personality

Voice: a sharp, friendly tutor sitting next to you — warm, never condescending.
Tone: encouraging and momentum-building; it celebrates the click of
understanding without confetti for its own sake. Three-word personality:
**playful, encouraging, quietly smart**. The playfulness is in the interaction
(things move, respond, reward), not in mascots or baby-talk; credibility comes
from taking the math seriously and explaining *why* a wrong answer was wrong.
Emotional goals: confidence ("I can actually do this"), delight at the moment a
concept lands, and the low-stakes momentum that makes a learner start the next
lesson.

## Anti-references

- **The textbook page** — walls of text, dense paragraphs, a formula stated then
  drilled. If a screen reads like something to study rather than something to do,
  it's wrong.
- **The lecture video** — passive watching, a talking head, "now you try" only at
  the end. Learning here is active from the first second.
- **The bare red X** — marking an answer wrong with no explanation. Every wrong
  answer gets a specific, useful nudge toward the next move.
- Generic ed-tech template feel: stock illustrations, hero-metric dashboards, and
  one-size course-card grids that could belong to any subject.

## Design Principles

- **Play before you name it.** Let the learner manipulate a concept until it
  clicks; only then attach the vocabulary. Discovery first, terminology second.
- **Every wrong answer teaches.** Feedback is specific and points to the next
  move — a targeted hint, never just a red X.
- **Instant and tactile.** The interface reacts to manipulation in well under
  ~100ms. Favor direct manipulation (drag, plot, rearrange) over reading.
- **Momentum, not pressure.** Celebrate progress and protect the streak; keep the
  stakes low so the learner keeps going rather than freezing on a mistake.
- **One idea, mastered.** Depth over breadth — one chapter genuinely understood
  beats a tour across many. Every screen earns its place in that single arc.

## Accessibility & Inclusion

No formal WCAG conformance target; best-effort, with these non-negotiables:

- **Readable contrast on the dark theme.** Body and feedback text stays well clear
  of the muted-gray washout against the charcoal (`#141414`) canvas — bump toward
  the ink end before shipping anything borderline.
- **Reduced motion is honored.** Every animation (button press, celebrations,
  confetti, lesson transitions) needs a `prefers-reduced-motion` alternative; the
  button system already does this — hold new motion to the same bar.
- **Feedback never relies on color alone.** Correct / incorrect / retryable states
  pair color with an icon or text so they read without color perception.
- **Interactive geometry stays reachable.** Drag/plot interactions should offer a
  keyboard- or tap-friendly path where feasible; don't gate core learning on fine
  pointer control alone.
