/**
 * End-of-lesson quizzes: a required, scored recap that runs after the last step
 * of each lesson, before the "Lesson complete!" celebration.
 *
 * Most lessons' quizzes are five NEW, hand-written questions that re-test the
 * lesson's concepts with fresh numbers/items (deliberately distinct from that
 * lesson's own exercises, so the quiz checks understanding rather than memory of
 * the worked examples); the end-of-level review is a longer ten-question recap.
 * Questions are plain `ProblemStep`s, so the quiz runner can
 * render them through the same `StepView` and grade them with the same
 * `gradeStep` engine the lesson uses: no new rendering or grading code.
 *
 * Authoring notes:
 * - Pythagorean triples used here (e.g. 5-12-13, 7-24-25, 9-12-15, 20-21-29) are
 *   chosen to avoid the triples each lesson already drilled (mostly 3-4-5 / 6-8-10).
 * - Feedback mirrors the lesson voice: a "why it's right" line, a couple of
 *   targeted hints for the likely slip (adding instead of squaring, forgetting
 *   the final root, …), and a fallback explanation.
 */
import type { LessonId, ProblemStep } from "./types";

// ---------------------------------------------------------------------------
// L1: The Right Triangle (vocabulary: legs, hypotenuse, right angle).
// Lesson drilled a 3-4-5 figure; here we use 8-6, 5-12 and 12-5 plus concept MCs.
// ---------------------------------------------------------------------------
const rightTriangleQuiz: ProblemStep[] = [
  {
    id: "q-intro-hypotenuse",
    kind: "problem",
    skill: "identify-sides",
    prompt: "Which side is the hypotenuse of this triangle?",
    interaction: {
      kind: "pick-side",
      a: 8,
      b: 6,
      correctSide: "c",
      orientation: "normal",
    },
    feedback: {
      correct:
        "Right! The hypotenuse is the slanted side opposite the right angle, and it's always the longest.",
      hints: [
        {
          selectionId: "a",
          hint: "That's a leg, one of the two sides that form the square corner. The hypotenuse is the slanted side facing it.",
        },
        {
          selectionId: "b",
          hint: "That's the other leg. Look for the side directly opposite the 90° corner.",
        },
      ],
      default:
        "The hypotenuse is the long, slanted side opposite the right angle (c).",
    },
  },
  {
    id: "q-intro-legs",
    kind: "problem",
    skill: "identify-sides",
    prompt: "Select both legs of this triangle.",
    interaction: {
      kind: "pick-sides",
      a: 5,
      b: 12,
      correctSides: ["a", "b"],
      orientation: "flipped",
    },
    feedback: {
      correct:
        "Exactly! The two legs meet at the right angle; together they're a and b.",
      hints: [
        {
          selectionId: "c",
          hint: "c is the hypotenuse, not a leg. Pick the two shorter sides that form the square corner.",
        },
      ],
      default:
        "The legs are the two sides that meet at the 90° corner: here, a and b.",
    },
  },
  {
    id: "q-intro-right-angle",
    kind: "problem",
    skill: "identify-sides",
    prompt: "Tap the corner that holds the right angle.",
    interaction: { kind: "pick-angle", a: 12, b: 5, correctVertex: "A" },
    feedback: {
      correct:
        "Correct! The right angle is where the two legs meet, marked by the small box.",
      hints: [
        {
          selectionId: "B",
          hint: "That corner is where a leg meets the hypotenuse. The right angle is where the two legs meet.",
        },
        {
          selectionId: "C",
          hint: "That corner is where a leg meets the hypotenuse. Look for where the two legs meet.",
        },
      ],
      default:
        "The right angle sits at the corner where the two legs meet, opposite the hypotenuse.",
    },
  },
  {
    id: "q-intro-hyp-fact",
    kind: "problem",
    skill: "identify-sides",
    prompt: "Which statement about the hypotenuse is true?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "longest", label: "It's the longest side, opposite the right angle" },
        { id: "forms", label: "It's one of the two sides that form the right angle" },
        { id: "short", label: "It's always the shortest side" },
      ],
      correctChoiceId: "longest",
    },
    feedback: {
      correct:
        "Exactly! The hypotenuse is always the longest side and sits opposite the right angle.",
      hints: [
        {
          selectionId: "forms",
          hint: "Those two sides are the legs. The hypotenuse is the one opposite the right angle.",
        },
        {
          selectionId: "short",
          hint: "It's the opposite: the hypotenuse is the longest side, not the shortest.",
        },
      ],
      default:
        "The hypotenuse is the longest side, and it lies opposite the right angle.",
    },
  },
  {
    id: "q-intro-one-right-angle",
    kind: "problem",
    skill: "identify-sides",
    prompt: "A right triangle always has exactly one ___.",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "ninety", label: "90° angle" },
        { id: "obtuse", label: "angle bigger than 90°" },
        { id: "equal", label: "pair of equal sides" },
      ],
      correctChoiceId: "ninety",
    },
    feedback: {
      correct:
        "Right! Every right triangle has exactly one 90° angle, and that defines it.",
      hints: [
        {
          selectionId: "obtuse",
          hint: "An angle bigger than 90° can't fit: the three angles already include a right angle and must total 180°.",
        },
        {
          selectionId: "equal",
          hint: "Equal sides aren't required. A right triangle can have three different side lengths.",
        },
      ],
      default: "A right triangle is defined by having exactly one 90° angle.",
    },
  },
];

// ---------------------------------------------------------------------------
// L2: Discover the Theorem (count areas, prove a² + b² = c²).
// Lesson counted the 3-4-5 squares and tried 6-8; here we use a 7×7 grid and
// a 5-12-13 triangle, plus concept MCs on the proof.
// ---------------------------------------------------------------------------
const discoverTheoremQuiz: ProblemStep[] = [
  {
    id: "q-discover-area",
    kind: "problem",
    skill: "areas-of-squares",
    prompt:
      "Build a square on a leg of length 7. As a $7 \\times 7$ grid of unit cells, how many unit squares is that?",
    interaction: { kind: "numeric", answer: 49, placeholder: "?" },
    feedback: {
      correct: "Yes! A $7 \\times 7$ grid holds $7 \\times 7 = 49$ unit squares, so its area is 49.",
      hints: [
        { equals: 14, hint: "14 is $7 + 7$. A $7 \\times 7$ grid is 7 rows of 7: multiply, don't add." },
        { equals: 28, hint: "28 is the perimeter ($4 \\times 7$). Count the cells inside: $7 \\times 7$." },
      ],
      default: "The square on a side of length 7 is a $7 \\times 7$ grid: $7 \\times 7 = 49$.",
    },
  },
  {
    id: "q-discover-sum",
    kind: "problem",
    skill: "areas-of-squares",
    prompt: "For a right triangle with legs 5 and 12, what is $5^2 + 12^2$?",
    interaction: { kind: "numeric", answer: 169, placeholder: "?" },
    visual: { kind: "right-triangle", a: 5, b: 12, labels: true },
    feedback: {
      correct:
        "Right! $25 + 144 = 169$, and that total is exactly the square on the hypotenuse.",
      hints: [
        { equals: 17, hint: "17 is $5 + 12$. Square each leg first: $5^2 + 12^2 = 25 + 144$." },
        { equals: 60, hint: "60 is $5 \\times 12$. You want $5^2 + 12^2$, which is $25 + 144$." },
      ],
      default: "Square each leg, then add: $5^2 + 12^2 = 25 + 144 = 169$.",
    },
  },
  {
    id: "q-discover-root",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "So $5^2 + 12^2 = 169$ is the hypotenuse squared. How long is the hypotenuse?",
    interaction: { kind: "numeric", answer: 13, unit: "units", placeholder: "?" },
    visual: { kind: "right-triangle", a: 5, b: 12, labels: true, unknownSide: "c" },
    feedback: {
      correct: "Exactly! The hypotenuse is $\\sqrt{169} = 13$.",
      hints: [
        { equals: 169, hint: "169 is $c^2$. Take the square root to get the side itself: $\\sqrt{169}$." },
        { equals: 84.5, hint: "Don't halve it. The hypotenuse is $\\sqrt{169}$, not $169 \\div 2$." },
      ],
      default: "c = $\\sqrt{5^2 + 12^2} = \\sqrt{169} = 13$.",
    },
  },
  {
    id: "q-discover-proof",
    kind: "problem",
    skill: "theorem-statement",
    prompt: "Why does the rearrangement prove $a^2 + b^2 = c^2$ for every right triangle?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        {
          id: "leftover",
          label:
            "The same four triangles leave equal leftover area: $c^2$ in one layout, $a^2 + b^2$ in the other",
        },
        { id: "only345", label: "Because the triangle is always a 3-4-5 triangle" },
        { id: "angles", label: "Because the three angles always add up to 180°" },
      ],
      correctChoiceId: "leftover",
    },
    feedback: {
      correct:
        "Exactly! Same square, same four triangles, so the two leftover areas must be equal: $c^2 = a^2 + b^2$.",
      hints: [
        {
          selectionId: "only345",
          hint: "It isn't limited to 3-4-5. The rearrangement works for any right triangle.",
        },
        {
          selectionId: "angles",
          hint: "True for every triangle, but that's not what the proof uses. It's about leftover area.",
        },
      ],
      default:
        "Four identical triangles fill the same big square two ways; the leftover is $c^2$ one way and $a^2 + b^2$ the other, so they're equal.",
    },
  },
  {
    id: "q-discover-generalize",
    kind: "problem",
    skill: "theorem-statement",
    prompt: "Counting showed $3^2 + 4^2 = 5^2$. Which statement does this generalize to?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "general", label: "For any right triangle, $a^2 + b^2 = c^2$" },
        { id: "only", label: "Only the 3-4-5 triangle works this way" },
        { id: "sum", label: "For any right triangle, $a + b = c$" },
      ],
      correctChoiceId: "general",
    },
    feedback: {
      correct: "Right! $a^2 + b^2 = c^2$ holds for every right triangle, not just 3-4-5.",
      hints: [
        {
          selectionId: "only",
          hint: "3-4-5 is just one example. The proof shows it holds for all right triangles.",
        },
        {
          selectionId: "sum",
          hint: "It's the squares that add, not the sides themselves: $a^2 + b^2 = c^2$.",
        },
      ],
      default: "The pattern generalizes to $a^2 + b^2 = c^2$ for every right triangle.",
    },
  },
];

// ---------------------------------------------------------------------------
// L3: Find the Hypotenuse (square, add, square-root).
// Lesson used 3-4-5 and 6-8-10; here: 7², the 9-12-15 triple, and 12-16-20.
// ---------------------------------------------------------------------------
const findHypotenuseQuiz: ProblemStep[] = [
  {
    id: "q-hyp-square",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "What is $7^2$?",
    interaction: { kind: "numeric", answer: 49, placeholder: "?" },
    feedback: {
      correct: "Right! $7^2 = 7 \\times 7 = 49$.",
      hints: [
        { equals: 14, hint: "14 is $7 + 7$. Squaring means $7 \\times 7$, not $7 + 7$." },
        { equals: 7, hint: "That's just the number. $7^2$ means $7 \\times 7$." },
      ],
      default: "$7^2$ means $7 \\times 7 = 49$.",
    },
  },
  {
    id: "q-hyp-add",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "A right triangle has legs 9 and 12. What is $9^2 + 12^2$?",
    interaction: { kind: "numeric", answer: 225, placeholder: "?" },
    visual: { kind: "right-triangle", a: 9, b: 12, labels: true },
    feedback: {
      correct: "Nice! $81 + 144 = 225$, and that number is $c^2$.",
      hints: [
        { equals: 21, hint: "21 is $9 + 12$. Square each leg first: $81 + 144$." },
        { equals: 108, hint: "108 is $9 \\times 12$. You want $9^2 + 12^2 = 81 + 144$." },
      ],
      default: "Square each leg, then add: $9^2 + 12^2 = 81 + 144 = 225$.",
    },
  },
  {
    id: "q-hyp-root",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "$a^2 + b^2 = 225$ is the hypotenuse squared. How long is the hypotenuse?",
    interaction: { kind: "numeric", answer: 15, unit: "units", placeholder: "?" },
    visual: { kind: "right-triangle", a: 9, b: 12, labels: true, unknownSide: "c" },
    feedback: {
      correct: "Exactly! c = $\\sqrt{225} = 15$.",
      hints: [
        { equals: 225, hint: "225 is $c^2$. One step left: take the square root, $\\sqrt{225}$." },
        { equals: 112.5, hint: "Don't halve it. The hypotenuse is $\\sqrt{225} = 15$." },
      ],
      default: "c = $\\sqrt{a^2 + b^2} = \\sqrt{225} = 15$.",
    },
  },
  {
    id: "q-hyp-steps",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "What's the correct order of steps to find the hypotenuse from the two legs?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "right", label: "Square the legs, add them, then take the square root" },
        { id: "addfirst", label: "Add the legs, then square the result" },
        { id: "subtract", label: "Square the legs, then subtract one from the other" },
      ],
      correctChoiceId: "right",
    },
    feedback: {
      correct: "Right! Square, add, then take one square root of the sum.",
      hints: [
        {
          selectionId: "addfirst",
          hint: "Adding the legs first walks the corner. Square each leg before adding.",
        },
        {
          selectionId: "subtract",
          hint: "Subtraction is for finding a missing leg. For the hypotenuse you add the squares.",
        },
      ],
      default:
        "To find the hypotenuse: square each leg, add the squares, then take the square root.",
    },
  },
  {
    id: "q-hyp-full",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "A right triangle has legs 12 and 16. How long is the hypotenuse?",
    interaction: { kind: "numeric", answer: 20, unit: "units", placeholder: "?" },
    visual: { kind: "right-triangle", a: 12, b: 16, labels: true, unknownSide: "c" },
    feedback: {
      correct: "Correct! $12^2 + 16^2 = 144 + 256 = 400$, and $\\sqrt{400} = 20$.",
      hints: [
        { equals: 28, hint: "28 is $12 + 16$. Square first: $144 + 256 = 400$, then $\\sqrt{400}$." },
        { equals: 400, hint: "400 is $c^2$. One step left: take the square root, $\\sqrt{400} = 20$." },
      ],
      default: "c = $\\sqrt{12^2 + 16^2} = \\sqrt{144 + 256} = \\sqrt{400} = 20$.",
    },
  },
];

// ---------------------------------------------------------------------------
// L4: Find a Missing Leg (rearrange to a² = c² − b²; test for right angles).
// Lesson used 13-5-12 and a different triple set; here: 25-7-24, 15-9-12,
// a fresh categorize set, and a 26-24-10 word problem.
// ---------------------------------------------------------------------------
const findALegQuiz: ProblemStep[] = [
  {
    id: "q-leg-formula",
    kind: "problem",
    skill: "find-a-leg",
    prompt: "To find a missing leg, how do you rearrange $a^2 + b^2 = c^2$?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "minus", label: "$a^2 = c^2 - b^2$" },
        { id: "plus", label: "$a^2 = c^2 + b^2$" },
        { id: "sides", label: "$a = c - b$" },
      ],
      correctChoiceId: "minus",
    },
    feedback: {
      correct: "Yes! Subtract the known leg's square from the hypotenuse's square: $a^2 = c^2 - b^2$.",
      hints: [
        {
          selectionId: "plus",
          hint: "Adding makes $a^2$ too big. Subtract $b^2$ from both sides of $a^2 + b^2 = c^2$.",
        },
        {
          selectionId: "sides",
          hint: "It's the squares that subtract, not the sides themselves: $a^2 = c^2 - b^2$.",
        },
      ],
      default: "Subtract $b^2$ from both sides of $a^2 + b^2 = c^2$ to get $a^2 = c^2 - b^2$.",
    },
  },
  {
    id: "q-leg-25-7",
    kind: "problem",
    skill: "find-a-leg",
    prompt: "The hypotenuse is 25 and one leg is 7. Find the other leg.",
    interaction: { kind: "numeric", answer: 24, unit: "units", placeholder: "?" },
    visual: {
      kind: "right-triangle",
      a: 24,
      b: 7,
      labels: true,
      unknownSide: "a",
      showHypotenuseValue: true,
    },
    feedback: {
      correct: "Yes! $25^2 - 7^2 = 625 - 49 = 576$, and $\\sqrt{576} = 24$.",
      hints: [
        { equals: 18, hint: "18 is $25 - 7$. Subtract the squares instead: $625 - 49 = 576$." },
        { equals: 576, hint: "576 is the leg squared. Take the square root: $\\sqrt{576} = 24$." },
      ],
      default: "a = $\\sqrt{25^2 - 7^2} = \\sqrt{625 - 49} = \\sqrt{576} = 24$.",
    },
  },
  {
    id: "q-leg-15-9",
    kind: "problem",
    skill: "find-a-leg",
    prompt: "The hypotenuse is 15 and one leg is 9. Find the other leg.",
    interaction: { kind: "numeric", answer: 12, unit: "units", placeholder: "?" },
    visual: {
      kind: "right-triangle",
      a: 12,
      b: 9,
      labels: true,
      unknownSide: "a",
      showHypotenuseValue: true,
    },
    feedback: {
      correct: "Right! $15^2 - 9^2 = 225 - 81 = 144$, and $\\sqrt{144} = 12$.",
      hints: [
        { equals: 6, hint: "6 is $15 - 9$. Subtract the squares instead: $225 - 81 = 144$." },
        { equals: 144, hint: "144 is the leg squared. Take the square root: $\\sqrt{144} = 12$." },
      ],
      default: "a = $\\sqrt{15^2 - 9^2} = \\sqrt{225 - 81} = \\sqrt{144} = 12$.",
    },
  },
  {
    id: "q-leg-sort",
    kind: "problem",
    skill: "right-triangle-test",
    prompt: "Sort each triangle: does it have a right angle?",
    interaction: {
      kind: "categorize",
      bins: [
        { id: "right", label: "Right triangle" },
        { id: "not", label: "Not right" },
      ],
      items: [
        { id: "t-8-15-17", label: "8, 15, 17", binId: "right" },
        { id: "t-7-24-25", label: "7, 24, 25", binId: "right" },
        { id: "t-9-12-15", label: "9, 12, 15", binId: "right" },
        { id: "t-5-6-7", label: "5, 6, 7", binId: "not" },
        { id: "t-8-10-13", label: "8, 10, 13", binId: "not" },
      ],
    },
    feedback: {
      correct:
        "Nicely sorted. 8-15-17, 7-24-25 and 9-12-15 each pass $a^2 + b^2 = c^2$. 5-6-7 ($25 + 36 \\neq 49$) and 8-10-13 ($64 + 100 \\neq 169$) fail.",
      default:
        "Test each with its longest side: the right triangles satisfy $a^2 + b^2 = c^2$ (8-15-17, 7-24-25, 9-12-15). The other two don't.",
    },
  },
  {
    id: "q-leg-wire",
    kind: "problem",
    skill: "find-a-leg",
    prompt:
      "A 26 m guy-wire runs from the top of a 24 m mast to an anchor on the ground. How far is the anchor from the base?",
    interaction: { kind: "numeric", answer: 10, unit: "m", placeholder: "?" },
    visual: {
      kind: "right-triangle",
      a: 10,
      b: 24,
      labels: true,
      unknownSide: "a",
      showHypotenuseValue: true,
    },
    feedback: {
      correct: "Right! $26^2 - 24^2 = 676 - 576 = 100$, and $\\sqrt{100} = 10$ m.",
      hints: [
        { equals: 2, hint: "2 is $26 - 24$. Subtract the squares instead: $676 - 576 = 100$." },
        { equals: 100, hint: "100 is the leg squared. Take the square root: $\\sqrt{100} = 10$." },
      ],
      default:
        "The wire is the hypotenuse: distance = $\\sqrt{26^2 - 24^2} = \\sqrt{676 - 576} = \\sqrt{100} = 10$ m.",
    },
  },
];

// ---------------------------------------------------------------------------
// L5: Distance Between Points (the hypotenuse on a grid).
// Lesson used (3,4), (6,8) and (1,2)→(4,6); here: plot (5,2), and distances
// to (12,5), (9,12), and (2,3)→(10,9).
// ---------------------------------------------------------------------------
const directDistanceQuiz: ProblemStep[] = [
  {
    id: "q-dist-plot",
    kind: "problem",
    skill: "coordinate-distance",
    prompt: "Plot the point (5, 2) on the grid.",
    interaction: { kind: "plot-points", size: 6, targets: [{ x: 5, y: 2 }] },
    visual: { kind: "coordinate-grid", size: 6, markers: [{ x: 0, y: 0 }] },
    feedback: {
      correct: "That's the spot! 5 across, then 2 up.",
      default: "Count 5 to the right along the x-axis, then 2 up the y-axis.",
    },
  },
  {
    id: "q-dist-12-5",
    kind: "problem",
    skill: "coordinate-distance",
    prompt: "How far is (12, 5) from the origin (0, 0) in a straight line?",
    interaction: { kind: "numeric", answer: 13, unit: "units", placeholder: "?" },
    visual: {
      kind: "coordinate-grid",
      size: 12,
      markers: [
        { x: 0, y: 0 },
        { x: 12, y: 5 },
      ],
      showDistance: true,
    },
    feedback: {
      correct: "Right! The legs are 12 and 5, so the distance is $\\sqrt{144 + 25} = \\sqrt{169} = 13$.",
      hints: [
        { equals: 17, hint: "17 is $12 + 5$ (walking the corner). Cut straight across: $\\sqrt{12^2 + 5^2}$." },
      ],
      default: "The legs are 12 and 5, so distance = $\\sqrt{12^2 + 5^2} = \\sqrt{169} = 13$.",
    },
  },
  {
    id: "q-dist-9-12",
    kind: "problem",
    skill: "coordinate-distance",
    prompt: "How far is (9, 12) from the origin?",
    interaction: { kind: "numeric", answer: 15, unit: "units", placeholder: "?" },
    visual: {
      kind: "coordinate-grid",
      size: 12,
      markers: [
        { x: 0, y: 0 },
        { x: 9, y: 12 },
      ],
      showDistance: true,
    },
    feedback: {
      correct: "Yes! $\\sqrt{9^2 + 12^2} = \\sqrt{81 + 144} = \\sqrt{225} = 15$.",
      hints: [
        { equals: 21, hint: "21 is $9 + 12$. Cut the corner instead: $\\sqrt{81 + 144}$." },
      ],
      default: "The gaps are 9 and 12, so distance = $\\sqrt{81 + 144} = \\sqrt{225} = 15$.",
    },
  },
  {
    id: "q-dist-offset",
    kind: "problem",
    skill: "coordinate-distance",
    prompt: "How far is (10, 9) from (2, 3)?",
    interaction: { kind: "numeric", answer: 10, unit: "units", placeholder: "?" },
    visual: {
      kind: "coordinate-grid",
      size: 10,
      markers: [
        { x: 2, y: 3 },
        { x: 10, y: 9 },
      ],
      showDistance: true,
    },
    feedback: {
      correct: "Right! The gaps are $10 - 2 = 8$ and $9 - 3 = 6$, so distance = $\\sqrt{64 + 36} = 10$.",
      hints: [
        { equals: 14, hint: "Find the gaps first: $10 - 2 = 8$ across, $9 - 3 = 6$ up. Then $\\sqrt{8^2 + 6^2}$." },
        { equals: 24, hint: "Don't add the coordinates. Use the differences: 8 and 6." },
      ],
      default: "Horizontal gap 8, vertical gap 6, so distance = $\\sqrt{8^2 + 6^2} = \\sqrt{100} = 10$.",
    },
  },
  {
    id: "q-dist-shortcut",
    kind: "problem",
    skill: "coordinate-distance",
    prompt:
      "Walking the grid from (2, 3) to (10, 9) is $8 + 6 = 14$ blocks. Why is the straight-line distance only 10?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "diagonal", label: "The straight diagonal is shorter than going along the two legs" },
        { id: "wrong14", label: "Because 14 was calculated incorrectly" },
        { id: "always10", label: "Because the diagonal of any grid is always 10" },
      ],
      correctChoiceId: "diagonal",
    },
    feedback: {
      correct:
        "Exactly! Cutting straight across (10) beats walking along both legs (14). Squares add, not sides.",
      hints: [
        {
          selectionId: "wrong14",
          hint: "14 is the correct block-walking distance. The point is the straight path is shorter.",
        },
        {
          selectionId: "always10",
          hint: "The diagonal depends on the gaps. Here it happens to be 10 because the gaps are 8 and 6.",
        },
      ],
      default:
        "A straight line is the shortest path, so the diagonal (10) is shorter than the two legs added (14).",
    },
  },
];

// ---------------------------------------------------------------------------
// L6: Level Review. Unlike the other lessons, this one has no teaching steps:
// it's a single ten-question, end-of-level quiz (pass 8/10) that recaps the
// whole chapter, spanning every objective. Numbers/triples are fresh, distinct
// from the lessons' own exercises (which drill 3-4-5, 6-8-10, 5-12-13).
// ---------------------------------------------------------------------------
const levelReviewQuiz: ProblemStep[] = [
  {
    id: "q-review-name-hypotenuse",
    kind: "problem",
    skill: "identify-sides",
    prompt: "Which side is the hypotenuse of this triangle?",
    interaction: {
      kind: "pick-side",
      a: 9,
      b: 12,
      correctSide: "c",
      orientation: "normal",
    },
    feedback: {
      correct:
        "Right! The hypotenuse is the slanted side opposite the right angle, and it's always the longest.",
      hints: [
        {
          selectionId: "a",
          hint: "That's a leg, one of the two sides that form the square corner. The hypotenuse faces the right angle.",
        },
        {
          selectionId: "b",
          hint: "That's the other leg. Look for the slanted side directly opposite the 90° corner.",
        },
      ],
      default:
        "The hypotenuse is the long, slanted side opposite the right angle (c).",
    },
  },
  {
    id: "q-review-right-angle",
    kind: "problem",
    skill: "identify-sides",
    prompt: "Tap the corner that holds the right angle.",
    interaction: { kind: "pick-angle", a: 16, b: 12, correctVertex: "A" },
    feedback: {
      correct:
        "Correct! The right angle is where the two legs meet, marked by the small box.",
      hints: [
        {
          selectionId: "B",
          hint: "That corner is where a leg meets the hypotenuse. The right angle is where the two legs meet.",
        },
        {
          selectionId: "C",
          hint: "That corner is where a leg meets the hypotenuse. Look for where the two legs join.",
        },
      ],
      default:
        "The right angle sits where the two legs meet, opposite the hypotenuse.",
    },
  },
  {
    id: "q-review-prove",
    kind: "problem",
    skill: "theorem-statement",
    prompt:
      "Rearranging four copies of a right triangle inside one big square proves which fact?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        {
          id: "areas",
          label:
            "The square on the hypotenuse equals the two leg squares added together",
        },
        { id: "sum", label: "The hypotenuse equals the two legs added together" },
        { id: "angles", label: "The three angles always add up to 180°" },
      ],
      correctChoiceId: "areas",
    },
    feedback: {
      correct:
        "Exactly! The same four triangles leave $c^2$ of room one way and $a^2 + b^2$ the other, so $a^2 + b^2 = c^2$.",
      hints: [
        {
          selectionId: "sum",
          hint: "It's the squares (areas) that match, not the side lengths themselves.",
        },
        {
          selectionId: "angles",
          hint: "True for every triangle, but the area proof is about leftover area, not angles.",
        },
      ],
      default:
        "The leftover area is $c^2$ in one arrangement and $a^2 + b^2$ in the other, so the two are equal.",
    },
  },
  {
    id: "q-review-hypotenuse",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt: "A right triangle has legs 18 and 24. How long is the hypotenuse?",
    interaction: { kind: "numeric", answer: 30, unit: "units", placeholder: "?" },
    visual: { kind: "right-triangle", a: 18, b: 24, labels: true, unknownSide: "c" },
    feedback: {
      correct: "Yes! $18^2 + 24^2 = 324 + 576 = 900$, and $\\sqrt{900} = 30$.",
      hints: [
        { equals: 42, hint: "42 is $18 + 24$. Square each leg first: $324 + 576$, then take the square root." },
        { equals: 900, hint: "900 is $c^2$. You're one step away: take its square root." },
      ],
      default: "c = $\\sqrt{18^2 + 24^2} = \\sqrt{324 + 576} = \\sqrt{900} = 30$.",
    },
  },
  {
    id: "q-review-ramp",
    kind: "problem",
    skill: "find-hypotenuse",
    prompt:
      "A skate ramp rises 9 ft and runs 40 ft along the ground. How long is the sloping surface?",
    interaction: { kind: "numeric", answer: 41, unit: "ft", placeholder: "?" },
    feedback: {
      correct: "Nice! $9^2 + 40^2 = 81 + 1600 = 1681$, and $\\sqrt{1681} = 41$ ft.",
      hints: [
        { equals: 49, hint: "49 is $9 + 40$. The slope is the hypotenuse: square each side, add, then take the square root." },
        { equals: 1681, hint: "1681 is the slope squared. One step left: take its square root." },
      ],
      default:
        "The slope is the hypotenuse: $\\sqrt{9^2 + 40^2} = \\sqrt{81 + 1600} = \\sqrt{1681} = 41$ ft.",
    },
  },
  {
    id: "q-review-missing-leg",
    kind: "problem",
    skill: "find-a-leg",
    prompt: "The hypotenuse is 37 and one leg is 12. Find the other leg.",
    interaction: { kind: "numeric", answer: 35, unit: "units", placeholder: "?" },
    visual: {
      kind: "right-triangle",
      a: 35,
      b: 12,
      labels: true,
      unknownSide: "a",
      showHypotenuseValue: true,
    },
    feedback: {
      correct: "Right! $37^2 - 12^2 = 1369 - 144 = 1225$, and $\\sqrt{1225} = 35$.",
      hints: [
        { equals: 25, hint: "25 is $37 - 12$. Subtract the squares instead: $1369 - 144$, then take the square root." },
        { equals: 1225, hint: "1225 is the leg squared. Take its square root to get the leg." },
      ],
      default: "a = $\\sqrt{37^2 - 12^2} = \\sqrt{1369 - 144} = \\sqrt{1225} = 35$.",
    },
  },
  {
    id: "q-review-leg-formula",
    kind: "problem",
    skill: "find-a-leg",
    prompt: "Which equation correctly solves for the missing leg b?",
    interaction: {
      kind: "multiple-choice",
      choices: [
        { id: "minus", label: "$b^2 = c^2 - a^2$" },
        { id: "plus", label: "$b^2 = c^2 + a^2$" },
        { id: "sides", label: "$b = c - a$" },
      ],
      correctChoiceId: "minus",
    },
    feedback: {
      correct:
        "Yes! Subtract the known leg's square from the hypotenuse's square: $b^2 = c^2 - a^2$.",
      hints: [
        {
          selectionId: "plus",
          hint: "Adding makes the leg too big. Start from $a^2 + b^2 = c^2$ and move $a^2$ across.",
        },
        {
          selectionId: "sides",
          hint: "It's the squares that subtract, not the sides themselves.",
        },
      ],
      default: "Rearrange $a^2 + b^2 = c^2$ to $b^2 = c^2 - a^2$ to isolate the missing leg.",
    },
  },
  {
    id: "q-review-identify",
    kind: "problem",
    skill: "right-triangle-test",
    prompt: "Sort each set of side lengths: is it a right triangle?",
    interaction: {
      kind: "categorize",
      bins: [
        { id: "right", label: "Right triangle" },
        { id: "not", label: "Not right" },
      ],
      items: [
        { id: "t-20-21-29", label: "20, 21, 29", binId: "right" },
        { id: "t-16-30-34", label: "16, 30, 34", binId: "right" },
        { id: "t-10-24-26", label: "10, 24, 26", binId: "right" },
        { id: "t-8-9-12", label: "8, 9, 12", binId: "not" },
        { id: "t-6-8-11", label: "6, 8, 11", binId: "not" },
      ],
    },
    feedback: {
      correct:
        "Nicely sorted! 20-21-29, 16-30-34 and 10-24-26 each pass $a^2 + b^2 = c^2$. 8-9-12 ($64 + 81 \\neq 144$) and 6-8-11 ($36 + 64 \\neq 121$) fail.",
      default:
        "Test each set with its longest side as c: a right triangle satisfies $a^2 + b^2 = c^2$.",
    },
  },
  {
    id: "q-review-distance-origin",
    kind: "problem",
    skill: "coordinate-distance",
    prompt: "How far is (12, 9) from the origin (0, 0) in a straight line?",
    interaction: { kind: "numeric", answer: 15, unit: "units", placeholder: "?" },
    visual: {
      kind: "coordinate-grid",
      size: 12,
      markers: [
        { x: 0, y: 0 },
        { x: 12, y: 9 },
      ],
      showDistance: true,
    },
    feedback: {
      correct: "Right! The legs are 12 and 9, so the distance is $\\sqrt{144 + 81} = \\sqrt{225} = 15$.",
      hints: [
        { equals: 21, hint: "21 is $12 + 9$ (walking the corner). Cut straight across: $\\sqrt{12^2 + 9^2}$." },
        { equals: 225, hint: "225 is the distance squared. Take its square root." },
      ],
      default: "The legs are 12 and 9, so distance = $\\sqrt{12^2 + 9^2} = \\sqrt{225} = 15$.",
    },
  },
  {
    id: "q-review-distance-offset",
    kind: "problem",
    skill: "coordinate-distance",
    prompt: "Find the straight-line distance from (1, 1) to (9, 16).",
    interaction: { kind: "numeric", answer: 17, unit: "units", placeholder: "?" },
    visual: {
      kind: "coordinate-grid",
      size: 16,
      markers: [
        { x: 1, y: 1 },
        { x: 9, y: 16 },
      ],
      showDistance: true,
    },
    feedback: {
      correct: "Right! The gaps are $9 - 1 = 8$ and $16 - 1 = 15$, so d = $\\sqrt{64 + 225} = \\sqrt{289} = 17$.",
      hints: [
        { equals: 23, hint: "23 is $8 + 15$. Cut the corner: gaps $9 - 1 = 8$ and $16 - 1 = 15$, then $\\sqrt{8^2 + 15^2}$." },
        { equals: 289, hint: "289 is the distance squared. Take its square root." },
      ],
      default: "Gaps 8 and 15, so d = $\\sqrt{8^2 + 15^2} = \\sqrt{289} = 17$.",
    },
  },
];

/**
 * End-of-lesson quizzes, keyed by lesson id. Lessons get five hand-written
 * recap questions; the level review is a ten-question, end-of-level quiz.
 */
export const quizzes: Record<LessonId, ProblemStep[]> = {
  "pythagoras-intro": rightTriangleQuiz,
  "discover-theorem": discoverTheoremQuiz,
  "use-the-theorem": findHypotenuseQuiz,
  "find-a-missing-leg": findALegQuiz,
  "direct-distance": directDistanceQuiz,
  "level-review": levelReviewQuiz,
};

/** The recap quiz for a lesson, or undefined if it has none. */
export function getQuiz(id: LessonId): ProblemStep[] | undefined {
  return quizzes[id];
}

/**
 * Default score needed to pass a recap quiz (4 of 5 = 80%). The level review
 * overrides this with a higher bar (8 of 10); see `lesson-runner.tsx`.
 */
export const QUIZ_PASS_THRESHOLD = 4;
