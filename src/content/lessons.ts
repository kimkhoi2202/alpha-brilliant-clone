/**
 * Lesson registry: the Pythagorean Theorem chapter, authored as data.
 *
 * Proof-first arc: students name the parts, then *discover* and *prove*
 * a² + b² = c² (by counting unit squares and rearranging four triangles) before
 * the equation is ever stated, so the theorem lands as a conclusion, not a rule
 * to memorize. Then they apply it (hypotenuse, missing leg, distance, review).
 *
 * Each step has hand-written, targeted feedback (a wrong answer must teach).
 * Adding a lesson is adding an object here + registering its id in `course.ts`.
 */
import type { Lesson, LessonId } from "./types";

// ---------------------------------------------------------------------------
// L1: meet the right triangle and its parts (vocabulary + a hook).
// ---------------------------------------------------------------------------
const rightTriangle: Lesson = {
  id: "pythagoras-intro",
  title: "The Right Triangle",
  conceptSummary:
    "A right triangle has one 90° corner. Its two short sides are the legs; the long side opposite the right angle is the hypotenuse.",
  estimatedMinutes: 4,
  steps: [
    {
      id: "square-corner",
      kind: "concept",
      title: "",
      body: "Every right triangle has exactly one square corner: a 90° angle, marked with a small box. The side directly across from that corner is the hypotenuse.",
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true, letterLabels: true },
      continueLabel: "Got it",
    },
    {
      id: "find-hypotenuse",
      kind: "problem",
      prompt: "Which side is the hypotenuse?",
      interaction: {
        kind: "pick-side",
        a: 3,
        b: 4,
        correctSide: "c",
        orientation: "normal",
      },
      feedback: {
        correct:
          "Exactly! The hypotenuse is the side opposite the right angle, and it's always the longest side.",
        hints: [
          {
            selectionId: "a",
            hint: "This side helps form the square corner. Does the hypotenuse touch the right angle, or sit across from it?",
          },
          {
            selectionId: "b",
            hint: "This side meets the right angle too. Which single side faces the 90° corner from across the triangle?",
          },
        ],
        default:
          "Find the right-angle corner first. Which side is the only one that doesn't touch it — the one lying straight across from it?",
      },
    },
    {
      id: "pick-legs",
      kind: "problem",
      prompt: "Select both legs of the triangle.",
      interaction: {
        kind: "pick-sides",
        a: 3,
        b: 4,
        correctSides: ["a", "b"],
        orientation: "flipped",
      },
      feedback: {
        correct: "That's correct! The two legs (a and b) meet at the right angle.",
        hints: [
          {
            selectionId: "c",
            hint: "Does that slanted side touch the right-angle corner? Remember, the legs are the two sides that actually meet to form the 90° angle.",
          },
        ],
        default:
          "Which two sides meet to form the right angle itself? Those are the legs — the slanted side opposite the corner isn't one of them.",
      },
    },
    {
      id: "where-right-angle",
      kind: "problem",
      prompt: "Where does the right angle sit?",
      interaction: { kind: "pick-angle", a: 3, b: 4, correctVertex: "A" },
      feedback: {
        correct:
          "Correct! The two legs meet to form the right angle, and the hypotenuse sits opposite it.",
        hints: [
          {
            selectionId: "B",
            hint: "At this corner a leg meets the slanted side. Where do the two legs meet each other instead?",
          },
          {
            selectionId: "C",
            hint: "Here a leg meets the slanted side. Which corner is where the two legs come together to make the square angle?",
          },
        ],
        default:
          "Which corner is where the two legs meet each other — the one sitting opposite the slanted side?",
      },
    },
    {
      id: "the-hook",
      kind: "concept",
      title:
        "Once you fix the two legs, the hypotenuse is locked to a single length! You're about to discover the hidden rule that ties the three sides together, and see why it has to be true.",
      body: "",
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true, letterLabels: true },
      continueLabel: "Let's discover it",
    },
  ],
};

// ---------------------------------------------------------------------------
// L2: discover the relationship by counting, then prove it by rearrangement.
// ---------------------------------------------------------------------------
const discoverTheorem: Lesson = {
  id: "discover-theorem",
  title: "Discover the Theorem",
  conceptSummary:
    "Counting and rearranging show that the squares on the two legs always combine to equal the square on the hypotenuse, which we write as a² + b² = c².",
  estimatedMinutes: 6,
  steps: [
    {
      id: "build-squares",
      kind: "concept",
      title: "A square on each side",
      body: "Build a square outward on each side of this 3-4-5 triangle. How big is each one? Let's measure them the most concrete way there is: by counting unit cells.",
      visual: { kind: "right-triangle", a: 3, b: 4, gridSquares: true, labels: true },
      continueLabel: "Start counting",
    },
    {
      id: "count-leg-a",
      kind: "problem",
      prompt: "Count the unit squares in the square on leg a (3 units).",
      interaction: { kind: "count-squares", a: 3, b: 4, countSide: "a" },
      feedback: {
        correct: "Yes! A $3 \\times 3$ grid holds 9 unit squares, so the square on leg a has area 9.",
        hints: [
          { equals: 12, hint: "That's the distance around the square (its perimeter). How many cells fill the inside — how many rows, and how many in each row?" },
          { equals: 6, hint: "That looks like one side plus another. To fill a square you multiply a side by itself, not add — what does that give?" },
        ],
        default: "How many unit cells run along one edge? Stack that many identical rows to fill the square — how many cells in all?",
      },
    },
    {
      id: "count-leg-b",
      kind: "problem",
      prompt: "Now count the unit squares in the square on leg b (4 units).",
      interaction: { kind: "count-squares", a: 3, b: 4, countSide: "b" },
      feedback: {
        correct: "Right! A $4 \\times 4$ grid is 16 unit squares.",
        hints: [{ equals: 8, hint: "That's $4 + 4$, adding the side to itself. Filling a square multiplies a side by itself instead — what does that come to?" }],
        default: "How many unit cells run along one edge? Stack that many identical rows to fill the square — how many cells in all?",
      },
    },
    {
      id: "count-hyp",
      kind: "problem",
      prompt: "Now count the unit squares in the (tilted) square on the hypotenuse.",
      interaction: { kind: "count-squares", a: 3, b: 4, countSide: "c" },
      feedback: {
        correct:
          "25 cells. Now look closely: $9 + 16 = 25$. The two leg squares hold exactly as many cells as the hypotenuse square!",
        hints: [
          { equals: 5, hint: "That's the length of one side of this tilted square. How many cells fill it when you multiply that side by itself?" },
        ],
        default: "How long is one edge of this tilted square? Multiply that length by itself to count every cell.",
      },
    },
    {
      id: "second-example",
      kind: "problem",
      prompt: "Coincidence? Try a different right triangle with legs 6 and 8. What is $6^2 + 8^2$?",
      interaction: { kind: "numeric", answer: 100, placeholder: "?" },
      visual: { kind: "right-triangle", a: 6, b: 8, labels: true },
      feedback: {
        correct:
          "100, which is exactly $10^2$, the hypotenuse squared. The pattern holds again.",
        hints: [{ equals: 14, hint: "That's $6 + 8$, the legs added. Square each leg first — what are $6^2$ and $8^2$, and then their sum?" }],
        default: "Square each leg on its own first, then add the two results — just like the last example.",
      },
    },
    {
      id: "the-proof",
      kind: "concept",
      title: "Why it's always true",
      body: "The same big square and four triangles, rearranged, leave the same gold area: one way it's a single $c^2$ square, the other $a^2$ and $b^2$. So $c^2 = a^2 + b^2$.",
      visual: { kind: "rearrangement-proof", a: 3, b: 4 },
      continueLabel: "That proves it",
    },
    {
      id: "proof-takeaway",
      kind: "problem",
      prompt: "What did the rearrangement prove?",
      interaction: {
        kind: "multiple-choice",
        choices: [
          {
            id: "areas",
            label: "The square on the hypotenuse equals the two squares on the legs combined",
          },
          { id: "sum", label: "The hypotenuse equals the two legs added together" },
          { id: "equal", label: "The four triangles all have the same area" },
        ],
        correctChoiceId: "areas",
      },
      feedback: {
        correct:
          "Exactly! The $c^2$ area equals the $a^2 + b^2$ area, and this works for every right triangle.",
        hints: [
          {
            selectionId: "sum",
            hint: "Close — but is it the side lengths that add up, or the areas of the squares built on those sides?",
          },
          {
            selectionId: "equal",
            hint: "The four triangles are congruent, true. But what did the rearrangement show about the two leg-squares versus the big square?",
          },
        ],
        default:
          "What did the matching gold areas show — how do the two leg-squares compare to the square on the hypotenuse?",
      },
    },
    {
      id: "the-rule",
      kind: "concept",
      title: "You just proved it!",
      body: "For every right triangle, the squares of the two legs add up to the square of the hypotenuse. That's the Pythagorean theorem:",
      equation: "$a^2 + b^2 = c^2$",
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true, letterLabels: true },
    },
  ],
};

// ---------------------------------------------------------------------------
// L3: apply it: square, add, square-root your way to the hypotenuse.
// ---------------------------------------------------------------------------
const findHypotenuse: Lesson = {
  id: "use-the-theorem",
  title: "Find the Hypotenuse",
  conceptSummary:
    "To find the hypotenuse: square the two legs, add them to get c², then take the square root.",
  estimatedMinutes: 5,
  steps: [
    {
      id: "squaring",
      kind: "concept",
      title: "What \u201csquared\u201d means",
      body: "A small ² just means \u201cmultiply a number by itself.\u201d So $3^2 = 3 \\times 3 = 9$, and $5^2 = 5 \\times 5 = 25$. Squaring is the engine of this theorem.",
    },
    {
      id: "what-is-c2",
      kind: "problem",
      prompt: "In $a^2 + b^2 = c^2$, what does $c^2$ represent?",
      interaction: {
        kind: "multiple-choice",
        choices: [
          { id: "hyp", label: "The square of the hypotenuse" },
          { id: "sum", label: "The hypotenuse plus the legs" },
          { id: "leg", label: "The square of a leg" },
        ],
        correctChoiceId: "hyp",
      },
      feedback: {
        correct:
          "Yes! c is the hypotenuse, so $c^2$ is the hypotenuse multiplied by itself.",
        default:
          "Which side does c stand for? And what does squaring that side — multiplying it by itself — give you?",
      },
    },
    {
      id: "build-equation",
      kind: "problem",
      prompt: "Build the Pythagorean theorem.",
      interaction: {
        kind: "tile-expression",
        tiles: ["a²", "b²", "c²", "2ab"],
        template: [null, "+", null, "=", null],
        solution: ["a²", "b²", "c²"],
      },
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true, letterLabels: true },
      feedback: {
        correct: "That's it! $a^2 + b^2 = c^2$.",
        default:
          "The left side should be the two legs' squares added together. What should that equal on the right? (One tile here is only a distractor.)",
      },
    },
    {
      id: "square-a-leg",
      kind: "problem",
      prompt: "If a leg has length 3, what is $a^2$?",
      interaction: { kind: "numeric", answer: 9, placeholder: "?" },
      feedback: {
        correct: "Right! $3^2 = 3 \\times 3 = 9$.",
        hints: [
          { equals: 6, hint: "That's $3 + 3$. Squaring isn't adding — what is $3$ times $3$?" },
          { equals: 3, hint: "That's just the side itself. What does $3^2$ — three multiplied by itself — come to?" },
        ],
        default: "What does $a^2$ mean? It's the side multiplied by itself, not added to itself.",
      },
    },
    {
      id: "add-the-squares",
      kind: "problem",
      prompt: "The legs are 3 and 4. What is $a^2 + b^2$?",
      interaction: { kind: "numeric", answer: 25, placeholder: "?" },
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true },
      feedback: {
        correct: "Nice! $3^2 + 4^2 = 9 + 16 = 25$, and that number is $c^2$.",
        hints: [
          { equals: 7, hint: "That's $3 + 4$, the legs added. Square each one first — what are $3^2$ and $4^2$, and then their total?" },
          { equals: 12, hint: "That's $3 \\times 4$, the legs multiplied. The theorem wants $3^2 + 4^2$ instead — what does each square come to?" },
        ],
        default: "Square each leg on its own first, then add those two squares together.",
      },
    },
    {
      id: "side-from-area",
      kind: "problem",
      prompt: "$a^2 + b^2 = 25$ is the hypotenuse squared. So how long is the hypotenuse?",
      interaction: { kind: "numeric", answer: 5, unit: "units" },
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true },
      feedback: {
        correct: "Exactly! $c = \\sqrt{25} = 5$.",
        hints: [
          { equals: 25, hint: "That's $c^2$ — the area, not the side. What operation undoes squaring to get $c$ back?" },
          { equals: 12.5, hint: "Halving isn't the opposite of squaring. What number, multiplied by itself, gives 25?" },
        ],
        default: "You have $c^2 = 25$. What number times itself makes 25?",
      },
    },
    {
      id: "hyp-6-8",
      kind: "problem",
      prompt: "A right triangle has legs 6 and 8. How long is the hypotenuse?",
      interaction: { kind: "numeric", answer: 10, unit: "units", placeholder: "?" },
      visual: { kind: "right-triangle", a: 6, b: 8, labels: true, unknownSide: "c" },
      feedback: {
        correct: "Correct! $6^2 + 8^2 = 36 + 64 = 100$, and $\\sqrt{100} = 10$.",
        hints: [
          { equals: 14, hint: "That's $6 + 8$, the legs added. Square each first instead — what's $6^2 + 8^2$, and what undoes that final square?" },
          { equals: 100, hint: "You've found $c^2$ — one step to go. What operation turns $c^2$ back into $c$?" },
        ],
        default: "Square each leg and add them to get $c^2$ — then what do you do to $c^2$ to find $c$ itself?",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L4: rearrange the rule to find a missing leg, and test for right angles.
// ---------------------------------------------------------------------------
const findALeg: Lesson = {
  id: "find-a-missing-leg",
  title: "Find a Missing Leg",
  conceptSummary:
    "Rearrange a² + b² = c² into a² = c² − b² to find a missing leg, and use the theorem to test whether a triangle is right.",
  estimatedMinutes: 5,
  steps: [
    {
      id: "build-rearranged",
      kind: "problem",
      prompt: "Rearrange the theorem to find a missing leg.",
      interaction: {
        kind: "tile-expression",
        tiles: ["a²", "b²", "c²", "2bc"],
        template: [null, "=", null, "\u2212", null],
        solution: ["a²", "c²", "b²"],
      },
      visual: { kind: "right-triangle", a: 3, b: 4, labels: true, letterLabels: true },
      feedback: {
        correct:
          "Yes! $a^2 = c^2 - b^2$. Subtract the known leg's square from the hypotenuse's square.",
        default: "Start from $a^2 + b^2 = c^2$. To get $a^2$ alone, what has to move to the other side — and how does its sign change?",
      },
    },
    {
      id: "find-a-leg",
      kind: "problem",
      prompt: "The hypotenuse is 13 and one leg is 5. Find the other leg.",
      interaction: { kind: "numeric", answer: 12, unit: "units", placeholder: "?" },
      visual: {
        kind: "right-triangle",
        a: 12,
        b: 5,
        labels: true,
        unknownSide: "a",
        showHypotenuseValue: true,
      },
      feedback: {
        correct: "Yes! $13^2 - 5^2 = 169 - 25 = 144$, and $\\sqrt{144} = 12$.",
        hints: [
          { equals: 8, hint: "That's $13 - 5$, subtracting the sides directly. The theorem works with squares — what is $13^2 - 5^2$, and what undoes that square at the end?" },
          { equals: 144, hint: "That's the missing leg squared. What operation turns a squared length back into the length itself?" },
        ],
        default: "Use $a^2 = c^2 - b^2$: subtract the known square from the hypotenuse's square — then how do you get the leg from its square?",
      },
    },
    {
      id: "why-not-sum",
      kind: "problem",
      prompt: "Why isn't the hypotenuse just $a + b$ (for legs 6 and 8, that would be 14)?",
      interaction: {
        kind: "multiple-choice",
        choices: [
          {
            id: "straight",
            label: "A straight path (the hypotenuse) is shorter than going along both legs",
          },
          { id: "always", label: "It actually is: $a + b$ always equals c" },
          { id: "bigger", label: "Because c is bigger than $a + b$" },
        ],
        correctChoiceId: "straight",
      },
      visual: { kind: "right-triangle", a: 6, b: 8, labels: true, unknownSide: "c" },
      feedback: {
        correct:
          "Exactly! Cutting straight across (10) beats walking along both legs ($6 + 8 = 14$). Squares, not sides, add up.",
        hints: [
          {
            selectionId: "always",
            hint: "Test that claim: does $6 + 8$ really match the straight-across distance? Compare walking both legs with cutting straight across.",
          },
          {
            selectionId: "bigger",
            hint: "Think about direction: can a straight shortcut ever be longer than going around two sides?",
          },
        ],
        default:
          "Compare two routes between the same points — straight across versus along both legs. Which is shorter, and which one is the hypotenuse?",
      },
    },
    {
      id: "sort-right",
      kind: "problem",
      prompt: "Sort each triangle: does it have a right angle?",
      interaction: {
        kind: "categorize",
        bins: [
          { id: "right", label: "Right triangle" },
          { id: "not", label: "Not right" },
        ],
        items: [
          { id: "t1", label: "3, 4, 5", binId: "right" },
          { id: "t2", label: "6, 8, 10", binId: "right" },
          { id: "t3", label: "4, 5, 6", binId: "not" },
          { id: "t4", label: "5, 12, 13", binId: "right" },
          { id: "t5", label: "6, 7, 8", binId: "not" },
        ],
      },
      feedback: {
        correct:
          "Nicely sorted. 3-4-5, 6-8-10, and 5-12-13 each pass $a^2 + b^2 = c^2$. 4-5-6 ($16 + 25 \\neq 36$) and 6-7-8 ($36 + 49 \\neq 64$) fail.",
        default:
          "For each set, square the two shorter numbers and compare their sum to the square of the largest. When does $a^2 + b^2 = c^2$ actually hold?",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L5: the theorem as straight-line distance on a grid.
// ---------------------------------------------------------------------------
const directDistance: Lesson = {
  id: "direct-distance",
  title: "Distance Between Points",
  conceptSummary:
    "The straight-line distance between two points is the hypotenuse of a right triangle: go across, then up, then cut the corner.",
  estimatedMinutes: 5,
  steps: [
    {
      id: "across-then-up",
      kind: "concept",
      title: "Across, then up",
      body: "To get from one point to another, go across and then up. Those two moves are the legs of a right triangle, and the straight-line distance is the hypotenuse.",
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
      id: "plot-point",
      kind: "problem",
      prompt: "Plot the point (3, 4) on the grid.",
      interaction: { kind: "plot-points", size: 6, targets: [{ x: 3, y: 4 }] },
      visual: { kind: "coordinate-grid", size: 6, markers: [{ x: 0, y: 0 }] },
      feedback: {
        correct: "That's the spot! 3 across, then 4 up.",
        default: "Read the point as (x, y): how far across the x-axis, then how far up the y-axis? Place it where those meet.",
      },
    },
    {
      id: "distance-3-4",
      kind: "problem",
      prompt: "How far is (3, 4) from the origin (0, 0) in a straight line?",
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
        correct: "Right! The legs are 3 and 4, so the distance is $\\sqrt{9 + 16} = 5$.",
        hints: [{ equals: 7, hint: "That's $3 + 4$ — walking along both legs. The straight-line distance cuts the corner: what is $\\sqrt{3^2 + 4^2}$ asking you to do?" }],
        default: "The horizontal and vertical gaps are the legs (3 and 4). Square each, add them — then what undoes that square to give the distance?",
      },
    },
    {
      id: "distance-6-8",
      kind: "problem",
      prompt: "How far is (6, 8) from the origin?",
      interaction: { kind: "numeric", answer: 10, unit: "units" },
      visual: {
        kind: "coordinate-grid",
        size: 8,
        markers: [
          { x: 0, y: 0 },
          { x: 6, y: 8 },
        ],
        showDistance: true,
      },
      feedback: {
        correct: "Yes! $\\sqrt{6^2 + 8^2} = \\sqrt{100} = 10$.",
        hints: [{ equals: 14, hint: "That's $6 + 8$, the two legs walked end to end. Cutting straight across uses $\\sqrt{6^2 + 8^2}$ — what does that come to?" }],
        default: "The gaps across and up are 6 and 8. Square each, add them for the distance squared — then how do you get the distance itself?",
      },
    },
    {
      id: "distance-offset",
      kind: "problem",
      prompt: "How far is (4, 6) from (1, 2)?",
      interaction: { kind: "numeric", answer: 5, unit: "units" },
      visual: {
        kind: "coordinate-grid",
        size: 6,
        markers: [
          { x: 1, y: 2 },
          { x: 4, y: 6 },
        ],
        showDistance: true,
      },
      feedback: {
        correct: "Right! The gaps are $4 - 1 = 3$ and $6 - 2 = 4$, so the distance is $\\sqrt{9 + 16} = 5$.",
        hints: [
          { equals: 7, hint: "First find the gaps: how far apart are the x-values, and the y-values? Those gaps are your legs — then cut the corner with the theorem." },
          { equals: 9, hint: "Adding the coordinates isn't it. What are the differences in x and in y? Use those as the legs." },
        ],
        default: "Find the horizontal and vertical gaps between the points by subtracting coordinates. Those are the legs — now apply the distance idea.",
      },
    },
    {
      id: "pick-formula",
      kind: "problem",
      prompt: "Which one is the distance formula?",
      interaction: {
        kind: "multiple-choice",
        choices: [
          { id: "right", label: "$d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$" },
          { id: "sum", label: "$d = (x_2 - x_1) + (y_2 - y_1)$" },
          { id: "split", label: "$d = \\sqrt{x_2 - x_1} + \\sqrt{y_2 - y_1}$" },
        ],
        correctChoiceId: "right",
      },
      feedback: {
        correct: "Yes! Square the two gaps, add them, then take one square root over the whole sum.",
        hints: [
          { selectionId: "sum", hint: "Does adding the raw gaps give a straight-line distance, or does that just walk the corner? What has to happen to each gap first?" },
          { selectionId: "split", hint: "Look closely at where the square root sits: should it cover each term separately, or the whole sum at once?" },
        ],
        default: "Which option squares each gap, adds them, and takes a single square root over the whole sum? Match the steps to the formula.",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// L6: end-of-level review. Unlike the other lessons, this one has no teaching
// steps: entering it launches straight into a single ten-question quiz
// (pass 8/10), wired up in `lesson-runner.tsx`. Its questions live in
// `quizzes.ts` under "level-review".
// ---------------------------------------------------------------------------
const levelReview: Lesson = {
  id: "level-review",
  title: "Level Review",
  conceptSummary:
    "A ten-question quiz spanning the whole level: name the parts, find a hypotenuse and a missing leg, spot right triangles, and measure distance. Score 8 of 10 to pass.",
  estimatedMinutes: 6,
  // Quiz-only: no lesson steps. The runner sees the empty `steps` and jumps
  // straight to the "level-review" quiz from `quizzes.ts`.
  steps: [],
};

const allLessons: Lesson[] = [
  rightTriangle,
  discoverTheorem,
  findHypotenuse,
  findALeg,
  directDistance,
  levelReview,
];

export const lessons: Record<LessonId, Lesson> = Object.fromEntries(
  allLessons.map((lesson) => [lesson.id, lesson]),
);

export function getLesson(id: LessonId): Lesson | undefined {
  return lessons[id];
}
