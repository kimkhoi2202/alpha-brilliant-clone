/**
 * Server-side Koji tool whitelist for the gpt-5.5 chat backend (POST /api/chat).
 *
 * These are the CANONICAL, strict function-tool schemas the server hands to the
 * Responses API — and the NAME whitelist it enforces. The browser POSTs the list
 * of tool names it wants enabled; `selectKojiTools` intersects that with this set
 * and returns the strict schemas defined HERE (never a client-supplied schema),
 * so a tampered client can neither inject a tool nor a malformed schema (P3/P6).
 *
 * They MIRROR the client `appTools` catalog (names + params) minus the hint-UI
 * tools `giveHint` / `explainMiss` (excluded exactly as the realtime set excludes
 * them — they produce coaching TEXT for Koji to read back, which made him
 * tool-chatty; he coaches in his own single reply instead). This file is kept
 * DEPENDENCY-LIGHT and standalone: it must NOT import the client tool modules
 * (`reveal.ts` / `practice.ts` pull in the browser Firebase client). If a tool's
 * params change in `src/lib/ai/tools/*`, update the matching schema below.
 *
 * STRICT MODE NOTE: with `strict: true` the Responses API requires every property
 * to be listed in `required` and `additionalProperties: false`; an OPTIONAL field
 * is therefore expressed as nullable (its `type` includes `"null"`, and a nullable
 * enum carries `null` in its `enum`). The model passes `null` for "not provided";
 * the client strips those nulls back to `undefined` before its Zod validation, so
 * the existing `.optional()` schemas accept them unchanged.
 */

/** A strict function-tool definition in the Responses API shape. */
export interface KojiFunctionTool {
  type: "function";
  name: string;
  description: string;
  /** JSON Schema for the arguments (strict-mode shaped — see the module header). */
  parameters: Record<string, unknown>;
  strict: true;
}

/** An object schema with all keys required + closed (the strict-mode shape). */
function strictObject(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** No-argument tool schema (still valid + closed under strict mode). */
const NO_ARGS = strictObject({});

/**
 * The canonical chat tool catalog — mirrors `appTools` (minus the hint-UI tools).
 * Descriptions track the client `appTools` descriptions so the model reasons the
 * same way on either backend.
 */
export const KOJI_TOOLS: KojiFunctionTool[] = [
  {
    type: "function",
    name: "goToLesson",
    description:
      "Navigate the learner to a lesson by its id, resuming at their saved step unless a stepIndex is given. " +
      "Use readProgress to discover lesson ids, or prefer resumeLesson to continue where they left off.",
    parameters: strictObject({
      lessonId: { type: "string", description: "The id of the lesson to open." },
      stepIndex: {
        type: ["integer", "null"],
        minimum: 0,
        description:
          "Optional 0-based step to jump to; null to resume at the learner's saved step.",
      },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "resumeLesson",
    description:
      "Resume the learner's course: continues an in-progress lesson, otherwise starts the next available " +
      "one, at the position they left off.",
    parameters: NO_ARGS,
    strict: true,
  },
  {
    type: "function",
    name: "readState",
    description:
      "Read the learner's CURRENT in-progress answer to this problem (what they've selected, typed, or " +
      "plotted right now) and whether the whole answer is correct yet, so you can coach from where they " +
      "actually are. It returns only their own answer plus a single correct/incorrect flag — never the " +
      "target value and never which specific part is right or wrong. Reveal stays gated through revealSolution.",
    parameters: NO_ARGS,
    strict: true,
  },
  {
    type: "function",
    name: "listCanvasTargets",
    description:
      "List the parts of the current figure you can point at (their ids, roles, and labels), e.g. the " +
      "triangle's sides and right angle. Call this first so you highlight by a real id.",
    parameters: NO_ARGS,
    strict: true,
  },
  {
    type: "function",
    name: "highlightElement",
    description:
      "Tint a part of the current figure to draw the learner's eye to it (e.g. color a side). Use a stable " +
      "id from listCanvasTargets. Optional color (accent/warning/success/danger/muted) and an optional short " +
      "label. Highlighting a part is teaching — it is not revealing the answer.",
    parameters: strictObject({
      targetId: {
        type: "string",
        description: 'A stable part id from listCanvasTargets (e.g. "side-c").',
      },
      color: {
        type: ["string", "null"],
        enum: ["accent", "warning", "success", "danger", "muted", null],
        description: "Optional tint; null for the default (accent).",
      },
      label: {
        type: ["string", "null"],
        description: "Optional short label (a word or two); null for none.",
      },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "labelElement",
    description:
      "Tag a part of the current figure with a short text label (e.g. 'hypotenuse'). Use a stable id from " +
      "listCanvasTargets. Keep labels to a word or two.",
    parameters: strictObject({
      targetId: { type: "string", description: "A stable part id from listCanvasTargets." },
      text: { type: "string", description: "Short label text (a word or two)." },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "pointToElement",
    description:
      "Pulse a part of the current figure to draw attention to it (a gentle 'look here'). Use a stable id " +
      "from listCanvasTargets.",
    parameters: strictObject({
      targetId: { type: "string", description: "A stable part id from listCanvasTargets." },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "clearAnnotations",
    description:
      "Remove every highlight, label, and pulse you've drawn on the current figure (e.g. to reset before " +
      "guiding a different part).",
    parameters: NO_ARGS,
    strict: true,
  },
  {
    type: "function",
    name: "prefillAnswer",
    description:
      "Pre-fill the learner's in-progress answer in the figure WITHOUT submitting it — they still press " +
      "Check. `value` is parsed for the current interaction (a side like 'c', a number, a choice id, etc.). " +
      "Only do this when the learner asks you to set it up for them; never fill in an answer you computed " +
      "yourself (that is what revealSolution is for).",
    parameters: strictObject({
      value: {
        type: "string",
        description: "The answer to pre-fill (parsed per interaction; never submitted).",
      },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "generatePractice",
    description:
      "Generate fresh, verified practice problems (Pillar B). Each problem's answer is computed and " +
      "round-tripped through the grader before it's returned, so every problem is solvable and correct.",
    parameters: strictObject({
      interactionKind: {
        type: ["string", "null"],
        enum: [
          "numeric",
          "count-squares",
          "pick-side",
          "multiple-choice",
          "tile-expression",
          null,
        ],
        description: "Which verifiable kind to generate; null defaults to the current step's kind.",
      },
      difficulty: {
        type: ["string", "null"],
        enum: ["easy", "medium", "hard", null],
        description: "Target difficulty; null defaults from the learner's recent performance.",
      },
      count: {
        type: ["integer", "null"],
        minimum: 1,
        maximum: 3,
        description: "How many to generate (1-3); null for 1.",
      },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "setDifficulty",
    description:
      "Set the difficulty for generated practice (easy | medium | hard), or 'auto' to derive it from the " +
      "learner's recent performance. Applies to subsequent generatePractice calls.",
    parameters: strictObject({
      level: { type: "string", enum: ["easy", "medium", "hard", "auto"] },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "readProgress",
    description:
      "Read the learner's current streak, XP, and per-lesson mastery signal (read-only). Pass a lessonId to " +
      "include that lesson's detailed progress.",
    parameters: strictObject({
      lessonId: {
        type: ["string", "null"],
        description: "Optional lesson id for detailed stats; null for the overall snapshot.",
      },
    }),
    strict: true,
  },
  {
    type: "function",
    name: "revealSolution",
    description:
      "Reveal the worked answer to the current problem. Effort-gated: only allowed after the learner has " +
      "genuinely attempted it AND engaged you (a hint or conversation). Learner-initiated only — never call " +
      "this on your own. The answer is engine-computed and the step is marked assisted (no mastery credit).",
    parameters: NO_ARGS,
    strict: true,
  },
  {
    type: "function",
    name: "celebrate",
    description:
      "Fire Koji's success/streak celebration animation (cosmetic). Use after a correct answer, a streak, or " +
      "finishing a lesson.",
    parameters: strictObject({
      occasion: {
        type: ["string", "null"],
        enum: ["correct", "streak", "lesson-complete", "milestone", null],
        description: "What you're celebrating; null for a generic celebration.",
      },
    }),
    strict: true,
  },
];

/** The whitelist: the set of tool names the chat backend will ever expose. */
export const KOJI_TOOL_NAMES: ReadonlySet<string> = new Set(
  KOJI_TOOLS.map((tool) => tool.name),
);

/**
 * Resolve the tools to hand the model for a request. Given the client's requested
 * tool names, return the CANONICAL strict schemas for those that pass the
 * whitelist (preserving this catalog's order). An empty / missing request falls
 * back to the full catalog. The schema is always ours — the client only chooses
 * WHICH whitelisted tools are enabled, never their shape.
 */
export function selectKojiTools(
  requestedNames?: readonly string[],
): KojiFunctionTool[] {
  if (!requestedNames || requestedNames.length === 0) return KOJI_TOOLS;
  const wanted = new Set(requestedNames);
  return KOJI_TOOLS.filter((tool) => wanted.has(tool.name));
}
