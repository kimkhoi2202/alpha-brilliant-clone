/**
 * Chapter content — the Pythagorean Theorem, authored as data.
 *
 * `pythagoras-intro` is the deep, hand-built hero lesson (concept → identify →
 * explore with a slider → compute a missing side). The rest build the path and
 * exercise the remaining interaction types. Adding a lesson is adding an object
 * here + registering it in `course.ts` — no UI changes (AGENTS.md "Adding a lesson").
 */
import type { Lesson, LessonId } from "./types";

const pythagorasIntro: Lesson = {
  id: "pythagoras-intro",
  title: "Pythagoras' Theorem",
  conceptSummary:
    "In a right triangle, the squares on the two legs add up to the square on the hypotenuse: a² + b² = c².",
  estimatedMinutes: 4,
  steps: [
    {
      id: "intro",
      kind: "concept",
      title: "The right triangle",
      body: "A right triangle has one square corner (90°). The two short sides are the legs; the long side opposite the right angle is the hypotenuse.",
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true },
      continueLabel: "Got it",
    },
    {
      id: "find-hypotenuse",
      kind: "problem",
      prompt: "Which side is the hypotenuse?",
      interaction: {
        kind: "multiple-choice",
        choices: [
          { id: "a", label: "The bottom leg (a)" },
          { id: "b", label: "The vertical leg (b)" },
          { id: "c", label: "The slanted side (c)" },
        ],
        correctChoiceId: "c",
      },
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true },
      feedback: {
        correct:
          "Exactly — the hypotenuse is the side opposite the right angle, and it's always the longest side.",
        hints: [
          {
            selectionId: "a",
            hint: "The legs form the right angle. The hypotenuse is the side opposite it — the slanted one.",
          },
          {
            selectionId: "b",
            hint: "That's a leg. Look for the side opposite the 90° corner.",
          },
        ],
        default:
          "The hypotenuse is the side opposite the right angle (the longest side).",
      },
    },
    {
      id: "squares-picture",
      kind: "concept",
      title: "Squares on the sides",
      body: "Build a square on each side. Pythagoras says the two smaller squares add up to the big one: 3² + 4² = 9 + 16 = 25.",
      visual: { kind: "right-triangle", a: 3, b: 4, showSquares: true, labels: true },
    },
    {
      id: "slider-c",
      kind: "problem",
      prompt: "The legs are 3 and 4. Slide to set the hypotenuse c so that 9 + 16 = c².",
      interaction: { kind: "slider", min: 1, max: 10, step: 1, answer: 5 },
      visual: { kind: "right-triangle", a: 3, b: 4, showSquares: true, labels: true },
      feedback: {
        correct: "Nice — 3² + 4² = 25, and √25 = 5. The hypotenuse is 5.",
        hints: [
          {
            equals: 7,
            hint: "7 is just 3 + 4. You can't add the sides directly — add their squares first.",
          },
          { equals: 25, hint: "25 is c² (the area). Take the square root to get c." },
        ],
        default: "9 + 16 = 25, and c is the square root of 25.",
      },
    },
    {
      id: "compute-missing",
      kind: "problem",
      prompt: "A right triangle has legs 6 and 8. What is the length of the hypotenuse?",
      interaction: { kind: "numeric", answer: 10, unit: "units", placeholder: "?" },
      visual: { kind: "right-triangle", a: 6, b: 8, labels: true },
      feedback: {
        correct: "Correct — 6² + 8² = 36 + 64 = 100, and √100 = 10.",
        hints: [
          {
            equals: 14,
            hint: "14 is 6 + 8. Square each leg first: 36 + 64 = 100, then take the square root.",
          },
          {
            equals: 100,
            hint: "100 is c². Don't forget the last step — take the square root: √100 = 10.",
          },
        ],
        default: "Use a² + b² = c²: 36 + 64 = 100, so c = √100 = 10.",
      },
    },
  ],
};

const directDistance: Lesson = {
  id: "direct-distance",
  title: "Direct Distance",
  conceptSummary:
    "The straight-line distance between two points is the hypotenuse of a right triangle drawn on the grid.",
  estimatedMinutes: 4,
  steps: [
    {
      id: "intro",
      kind: "concept",
      title: "Distance on a grid",
      body: "Go across, then up: those two moves are the legs of a right triangle. The straight-line distance is the hypotenuse.",
      visual: {
        kind: "coordinate-grid",
        size: 6,
        markers: [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ],
        showDistance: true,
      },
    },
    {
      id: "plot",
      kind: "problem",
      prompt: "Plot the point (3, 4) on the grid.",
      interaction: { kind: "plot-points", size: 6, targets: [{ x: 3, y: 4 }] },
      visual: { kind: "coordinate-grid", size: 6, markers: [{ x: 0, y: 0 }] },
      feedback: {
        correct: "That's the spot — 3 across and 4 up.",
        default: "Count 3 to the right along the x-axis, then 4 up the y-axis.",
      },
    },
    {
      id: "distance",
      kind: "problem",
      prompt: "How far is (3, 4) from the origin (0, 0)?",
      interaction: { kind: "numeric", answer: 5, unit: "units" },
      visual: {
        kind: "coordinate-grid",
        size: 6,
        markers: [
          { x: 0, y: 0 },
          { x: 3, y: 4 },
        ],
        showDistance: true,
      },
      feedback: {
        correct: "Right — the legs are 3 and 4, so the distance is √(9 + 16) = 5.",
        hints: [{ equals: 7, hint: "7 is 3 + 4. Use Pythagoras: √(3² + 4²)." }],
        default: "The legs are 3 and 4, so distance = √(3² + 4²) = √25 = 5.",
      },
    },
  ],
};

const squaresAndSides: Lesson = {
  id: "squares-and-sides",
  title: "Squares and Sides",
  conceptSummary:
    "Pythagoras is about areas: the square on the hypotenuse equals the sum of the squares on the legs.",
  estimatedMinutes: 3,
  steps: [
    {
      id: "intro",
      kind: "concept",
      title: "Areas, not just lengths",
      body: "Each side carries a square. The theorem balances their areas.",
      visual: { kind: "right-triangle", a: 3, b: 4, showSquares: true, labels: true },
    },
    {
      id: "area-sum",
      kind: "problem",
      prompt:
        "The squares on the legs have areas 9 and 16. What is the area of the square on the hypotenuse?",
      interaction: { kind: "numeric", answer: 25, unit: "sq units" },
      visual: {
        kind: "right-triangle",
        a: 3,
        b: 4,
        showSquares: true,
        labels: true,
        unknownHypotenuse: true,
      },
      feedback: {
        correct: "Yes — 9 + 16 = 25. The big square equals the two small ones combined.",
        hints: [
          {
            equals: 5,
            hint: "5 is the side length, not the area. Add the two areas: 9 + 16.",
          },
        ],
        default: "Add the two leg-square areas: 9 + 16 = 25.",
      },
    },
  ],
};

const provingPythagoras: Lesson = {
  id: "proving-pythagoras",
  title: "Proving Pythagoras",
  conceptSummary: "State the theorem as an equation by arranging the pieces.",
  estimatedMinutes: 3,
  steps: [
    {
      id: "intro",
      kind: "concept",
      title: "Write the rule",
      body: "Pythagoras in symbols: the squares of the legs sum to the square of the hypotenuse.",
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true },
    },
    {
      id: "build-equation",
      kind: "problem",
      prompt: "Fill in the theorem.",
      interaction: {
        kind: "tile-expression",
        tiles: ["a²", "b²", "c²", "2ab"],
        template: [null, "+", null, "=", null],
        solution: ["a²", "b²", "c²"],
      },
      feedback: {
        correct: "That's it — a² + b² = c².",
        default: "The two legs are a and b, the hypotenuse is c: a² + b² = c².",
      },
    },
  ],
};

const levelReview: Lesson = {
  id: "level-review",
  title: "Level Review",
  conceptSummary: "Mixed practice across the chapter.",
  estimatedMinutes: 3,
  steps: [
    {
      id: "r1",
      kind: "problem",
      prompt: "Legs 5 and 12. Find the hypotenuse.",
      interaction: { kind: "numeric", answer: 13, unit: "units" },
      visual: { kind: "right-triangle", a: 5, b: 12, labels: true },
      feedback: {
        correct: "25 + 144 = 169, and √169 = 13.",
        hints: [
          { equals: 17, hint: "17 is 5 + 12. Square the legs first: 25 + 144 = 169." },
        ],
        default: "5² + 12² = 169, so c = √169 = 13.",
      },
    },
    {
      id: "r2",
      kind: "problem",
      prompt: "Which equation is the Pythagorean theorem?",
      interaction: {
        kind: "multiple-choice",
        choices: [
          { id: "x", label: "a + b = c" },
          { id: "y", label: "a² + b² = c²" },
          { id: "z", label: "a² − b² = c²" },
        ],
        correctChoiceId: "y",
      },
      feedback: {
        correct: "Correct — a² + b² = c².",
        hints: [
          {
            selectionId: "x",
            hint: "Close, but you can't add the sides directly — it's their squares.",
          },
        ],
        default: "It's a² + b² = c².",
      },
    },
  ],
};

export const lessons: Record<LessonId, Lesson> = {
  [pythagorasIntro.id]: pythagorasIntro,
  [directDistance.id]: directDistance,
  [squaresAndSides.id]: squaresAndSides,
  [provingPythagoras.id]: provingPythagoras,
  [levelReview.id]: levelReview,
};

export function getLesson(id: LessonId): Lesson | undefined {
  return lessons[id];
}
