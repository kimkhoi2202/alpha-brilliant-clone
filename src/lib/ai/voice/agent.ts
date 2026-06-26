/**
 * The Koji realtime agent (PRD-phase-2 §4.1 "warm, encouraging voice").
 *
 * Builds a `RealtimeAgent` with Koji's persona, the shared app tools, and a
 * compact, answer-free summary of the current problem so he's grounded in typed
 * state (P2) from the first word. The correct answer is deliberately NOT placed
 * in the prompt — revealing it is gated through the `revealSolution` tool (§2.3),
 * so it stays earned and engine-computed (P4).
 */
import { RealtimeAgent } from "@openai/agents-realtime";

import type { Grounding } from "../grounding";
import type { ToolContext } from "../tools";
import { VOICE_NAME } from "./constants";
import { buildRealtimeTools } from "./tools";

/** Koji's base persona + behavior contract (voice-tuned: short, warm, grounded). */
const BASE_INSTRUCTIONS = `
You are Koji, a warm, upbeat voice tutor inside a learn-by-doing course on the
Pythagorean theorem. You are talking with one learner out loud.

Voice style:
- Keep replies short and conversational — usually one to three sentences.
- Be encouraging and patient. Celebrate effort, not just correct answers.
- When you take an action, say a quick preamble while you do it
  (e.g. "Sure, let me pull that up.").

How you help (use your tools — don't just describe, act):
- Give nudging hints with giveHint; escalate only as needed. A hint must point
  the way without stating the result.
- When the learner is wrong and asks why, use explainMiss to name the actual
  mistake.
- For more practice, use generatePractice; adjust challenge with setDifficulty.
- To move around the course, use goToLesson / resumeLesson. Check streak, XP, or
  mastery with readProgress. Celebrate wins with celebrate.

The one rule about answers:
- Never say the final numeric answer yourself, and never compute it out loud.
- To reveal a worked answer, ALWAYS call revealSolution. It is effort-gated
  (the learner must have genuinely tried AND engaged you first) and the answer is
  computed by the app, so it is always correct. If it declines, relay its reason
  warmly and offer a hint instead. Only reveal when the learner explicitly asks.

Always ground what you say in the current problem state below. Do not invent
numbers or facts.
`.trim();

/** Compact, answer-free description of the current problem for grounding. */
function describeProblem(g: Grounding): string {
  const lines: string[] = [
    `Current problem: "${g.prompt}"`,
    `Interaction type: ${g.interactionKind}.`,
  ];

  const { triangle, choices, numeric, tiles } = g.givens;
  if (triangle) {
    const parts = [`a=${triangle.a}`, `b=${triangle.b}`];
    if (triangle.unit) parts.push(`unit=${triangle.unit}`);
    if (triangle.orientation) parts.push(`orientation=${triangle.orientation}`);
    lines.push(`Right-triangle givens: ${parts.join(", ")}.`);
  }
  if (choices && choices.length > 0) {
    lines.push(`Answer choices: ${choices.map((c) => c.label).join(" / ")}.`);
  }
  if (numeric?.unit) lines.push(`Expected answer unit: ${numeric.unit}.`);
  if (tiles) lines.push(`Tiles available: ${tiles.bank.join(", ")}.`);
  if (g.learnerAnswerText) lines.push(`Their current answer: ${g.learnerAnswerText}.`);
  lines.push(`Attempts so far on this step: ${g.attemptNumber}.`);

  return lines.join("\n");
}

/** Full instruction string: persona + (optional) grounded current-problem block. */
function buildInstructions(grounding: Grounding | null): string {
  if (!grounding) {
    return `${BASE_INSTRUCTIONS}\n\nThe learner is on a concept/reading step right now, not a graded problem.`;
  }
  return `${BASE_INSTRUCTIONS}\n\n${describeProblem(grounding)}`;
}

export interface CreateKojiAgentOptions {
  /** Live tool-context getter — tools always run against the current step. */
  getContext: () => ToolContext;
  /** The current step's grounding for instruction context, or null. */
  grounding: Grounding | null;
  /** Override Koji's voice (defaults to the warm `VOICE_NAME`). */
  voice?: string;
}

/** Construct the Koji `RealtimeAgent` with persona, grounding, and bound tools. */
export function createKojiRealtimeAgent(options: CreateKojiAgentOptions) {
  return new RealtimeAgent({
    name: "Koji",
    voice: options.voice ?? VOICE_NAME,
    instructions: buildInstructions(options.grounding),
    tools: buildRealtimeTools(options.getContext),
  });
}
