/**
 * `runTutor` — grounded text tutoring (PRD §4.1): progressive hints and
 * personalized wrong-answer explanations.
 *
 * The model PHRASES; our code stays the source of truth. We pass the
 * engine-computed `correctAnswer` as grounding, but in hint mode we post-check
 * the output and never let the final answer leak (P4). The mistake itself is
 * classified deterministically upstream (client) from `AnswerValue` vs.
 * `correctAnswer()`; here we just turn that grounded state into warm prose.
 *
 * OpenAI endpoint (verified against openai@6.45.0):
 *   POST /v1/responses  ⇢  client.responses.create()  → `.output_text`
 *   (see node_modules/openai/resources/responses/responses.d.ts)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { OPENAI_API_KEY } from "../shared/secrets.js";
import { makeOpenAI, MODELS, type TextModel } from "../shared/openai.js";
import { requireUid } from "../shared/auth.js";
import { trackUsage } from "../shared/usage.js";
import type { InteractionKind } from "../content/types.js";

export type TutorMode = "hint" | "explain";

export interface RunTutorRequest {
  /** Concept under study, e.g. "Pythagorean theorem". */
  concept: string;
  /** The current step's prompt text the learner is looking at. */
  prompt: string;
  /** The interaction kind of the current step (for tailoring phrasing). */
  interactionKind: InteractionKind;
  /** Grounded known values (legs, side asked for, etc.). */
  givens: Record<string, string | number>;
  /** Engine-computed ground truth — used for grounding + leak post-check. */
  correctAnswer: string | number;
  /** What the learner submitted (used in "explain" mode). May be null. */
  learnerAnswer?: string | number | null;
  /** 1-based attempt count on this step (drives hint progression). */
  attemptNumber: number;
  /** "hint" = progressive nudge (no answer); "explain" = why the miss happened. */
  mode: TutorMode;
  /** Optional explicit progressive tier (1 → name idea, 2 → next step, 3 → set up). */
  hintTier?: 1 | 2 | 3;
}

export interface RunTutorResponse {
  /** The hint / explanation text to render. */
  text: string;
  /** Echo of the mode handled. */
  mode: TutorMode;
  /** Model actually used. */
  model: TextModel;
  /** Progressive tier used (hint mode only). */
  tier?: number;
  /**
   * True if a hint draft leaked the answer and we replaced it with a safe,
   * answer-free fallback (the firewall fired). Always false in explain mode.
   */
  withheldAnswer: boolean;
}

/** Tiered, answer-free fallback hints (also the AI-off-style safety net). */
const FALLBACK_HINTS: Record<1 | 2 | 3, string> = {
  1: "Think about which relationship connects the three sides of a right triangle — the one that squares each side.",
  2: "Use a² + b² = c². Decide which sides you already know and which one you're solving for.",
  3: "Set it up with your numbers: square the two known sides, then combine them — stop right before computing the final value yourself.",
};

/** Standalone-number / phrase leak check (Node 22 supports lookbehind). */
function mentionsAnswer(text: string, answer: string | number): boolean {
  const ans = String(answer).trim();
  if (!ans) return false;
  if (/^-?\d+(\.\d+)?$/.test(ans)) {
    const re = new RegExp(`(?<![\\d.])${ans.replace(/\./g, "\\.")}(?![\\d.])`);
    return re.test(text);
  }
  return text.toLowerCase().includes(ans.toLowerCase());
}

function resolveTier(req: RunTutorRequest): 1 | 2 | 3 {
  if (req.hintTier) return req.hintTier;
  // Auto-escalate by attempts: 1 → 1, 2 → 2, 3+ → 3.
  return req.attemptNumber >= 3 ? 3 : req.attemptNumber >= 2 ? 2 : 1;
}

function buildHintPrompt(req: RunTutorRequest, tier: 1 | 2 | 3): string {
  return [
    `Concept: ${req.concept}`,
    `Step prompt: ${req.prompt}`,
    `Interaction kind: ${req.interactionKind}`,
    `Known values: ${JSON.stringify(req.givens)}`,
    `Attempt number: ${req.attemptNumber}`,
    `Progressive hint tier: ${tier} (1 = name the idea, 2 = the next step, 3 = set it up with their numbers).`,
    `The correct answer is ${req.correctAnswer}. DO NOT state, spell out, or strongly imply this value.`,
    "Give exactly one short, encouraging hint at the requested tier. Stop before the final result.",
  ].join("\n");
}

function buildExplainPrompt(req: RunTutorRequest): string {
  return [
    `Concept: ${req.concept}`,
    `Step prompt: ${req.prompt}`,
    `Interaction kind: ${req.interactionKind}`,
    `Known values: ${JSON.stringify(req.givens)}`,
    `The learner answered: ${req.learnerAnswer ?? "(no answer)"}`,
    `The correct answer is: ${req.correctAnswer}`,
    "In 2-3 warm sentences, explain specifically why their answer is off (name the likely",
    "misconception, e.g. adding the legs instead of squaring), then point them at the right",
    "approach. You may reference the correct answer here since they have already attempted it.",
  ].join("\n");
}

const HINT_SYSTEM =
  "You are Koji, a warm, concise math tutor. You give progressive hints that build " +
  "understanding without ever handing over the final answer. One hint only. No preamble.";

const EXPLAIN_SYSTEM =
  "You are Koji, a warm, concise math tutor. You explain a learner's specific mistake " +
  "kindly and clearly, then nudge them toward the correct method. Keep it to 2-3 sentences.";

export const runTutor = onCall<RunTutorRequest>(
  { secrets: [OPENAI_API_KEY] },
  async (request): Promise<RunTutorResponse> => {
    const uid = requireUid(request);
    const req = request.data;

    if (!req || (req.mode !== "hint" && req.mode !== "explain")) {
      throw new HttpsError("invalid-argument", "mode must be 'hint' or 'explain'.");
    }
    if (!req.prompt || !req.concept) {
      throw new HttpsError("invalid-argument", "concept and prompt are required.");
    }

    const client = makeOpenAI(OPENAI_API_KEY.value());

    if (req.mode === "hint") {
      const tier = resolveTier(req);
      // Cheap, fast model for quick Tier-1 hints; flagship for deeper tiers.
      const model: TextModel = tier === 1 ? MODELS.hintMini : MODELS.text;

      const response = await client.responses.create({
        model,
        instructions: HINT_SYSTEM,
        input: buildHintPrompt(req, tier),
        max_output_tokens: 300,
      });

      const draft = (response.output_text ?? "").trim();
      // Verification firewall: a hint must never leak the answer.
      const leaked = draft.length === 0 || mentionsAnswer(draft, req.correctAnswer);
      const text = leaked ? FALLBACK_HINTS[tier] : draft;

      await trackUsage(uid, "tutorHints");
      return { text, mode: "hint", model, tier, withheldAnswer: leaked };
    }

    // explain mode
    const model: TextModel = MODELS.text;
    const response = await client.responses.create({
      model,
      instructions: EXPLAIN_SYSTEM,
      input: buildExplainPrompt(req),
      max_output_tokens: 400,
    });
    const text =
      (response.output_text ?? "").trim() ||
      "Let's look again: check whether you squared each side before combining them.";

    await trackUsage(uid, "tutorExplains");
    return { text, mode: "explain", model, withheldAnswer: false };
  },
);
