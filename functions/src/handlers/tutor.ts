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
import OpenAI from "openai";
import { z } from "zod";
import { OPENAI_API_KEY } from "../shared/secrets.js";
import { MODELS, type TextModel } from "../shared/openai.js";
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
  /** Engine-computed ground truth (DISPLAY string, e.g. "5 cm") — grounding + leak post-check. */
  correctAnswer: string | number;
  /**
   * For numeric answers, the raw numeric value behind `correctAnswer`. When
   * present, the hint leak firewall does robust value-based detection instead of
   * a substring scan that a display string like "5 cm" would defeat (C1).
   */
  correctAnswerValue?: number;
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
  /** The hint / explanation text to render (firewall already applied in hint mode). */
  text: string;
}

/** Tiered, answer-free fallback hints (also the AI-off-style safety net). */
const FALLBACK_HINTS: Record<1 | 2 | 3, string> = {
  1: "Think about which relationship connects the three sides of a right triangle — the one that squares each side.",
  2: "Use a² + b² = c². Decide which sides you already know and which one you're solving for.",
  3: "Set it up with your numbers: square the two known sides, then combine them — stop right before computing the final value yourself.",
};

/** Escape a string for literal use inside a `RegExp`. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Does `text` leak the numeric `value`? Matches the bare integer and its
 * trailing-zero decimal forms ("5", "5.0", "5.00") — and, for non-integers, the
 * 2-dp form — each bounded by a `(?!\d)` trailing guard so "5", "5 cm" and
 * "it's 5." all count while "50" / "15" / "0.5" do not.
 */
function mentionsNumericValue(text: string, value: number): boolean {
  const forms = new Set<string>([String(value)]);
  if (Number.isInteger(value)) {
    forms.add(`${value}.0`);
    forms.add(`${value}.00`);
  } else {
    forms.add(value.toFixed(2));
  }
  for (const form of forms) {
    if (new RegExp(`(?<![\\d.])${escapeRegExp(form)}(?!\\d)`).test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * Hint leak firewall (Node 22 supports lookbehind). For numeric answers the
 * client sends a DISPLAY string (e.g. "5 cm") plus the raw `value`; we detect
 * the value robustly so a leak like "it's 5." can't slip through the substring
 * path (C1). Non-numeric answers keep the case-insensitive substring check.
 */
// Exported for unit testing (the smoke test exercises the real leak firewall);
// behavior is unchanged — this is the same private helper `runTutor` calls.
export function mentionsAnswer(
  text: string,
  answer: string | number,
  value?: number,
): boolean {
  if (typeof value === "number" && Number.isFinite(value)) {
    return mentionsNumericValue(text, value);
  }
  const ans = String(answer).trim();
  if (!ans) return false;
  // Bare-number answer (no separate display value): number-boundary match.
  if (/^-?\d+(\.\d+)?$/.test(ans)) {
    return new RegExp(`(?<![\\d.])${escapeRegExp(ans)}(?!\\d)`).test(text);
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

/** Known interaction kinds (mirrors the `Interaction` union in content/types.ts). */
const INTERACTION_KINDS = [
  "multiple-choice",
  "multi-select",
  "categorize",
  "numeric",
  "slider",
  "plot-points",
  "tap-bar",
  "tile-expression",
  "pick-side",
  "pick-sides",
  "pick-angle",
  "count-squares",
] as const satisfies readonly InteractionKind[];

/**
 * Bound the untrusted request (defence-in-depth, PRD §3.6). Mirrors the
 * known-kind gate in `generate.ts`; rejects anything out of range with
 * `invalid-argument`.
 */
const runTutorSchema = z.object({
  concept: z.string().min(1).max(200),
  prompt: z.string().min(1).max(4000),
  interactionKind: z.enum(INTERACTION_KINDS),
  givens: z
    .record(z.string().max(100), z.union([z.string().max(500), z.number()]))
    .refine((g) => Object.keys(g).length <= 50, "givens has too many entries"),
  correctAnswer: z.union([z.string().max(500), z.number()]),
  correctAnswerValue: z.number().optional(),
  learnerAnswer: z.union([z.string().max(500), z.number(), z.null()]).optional(),
  attemptNumber: z.number().int().min(1).max(99),
  mode: z.enum(["hint", "explain"]),
  hintTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export const runTutor = onCall<RunTutorRequest>(
  { secrets: [OPENAI_API_KEY] },
  async (request): Promise<RunTutorResponse> => {
    const uid = requireUid(request);

    const parsed = runTutorSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues[0]?.message ?? "Invalid runTutor request.",
      );
    }
    const req: RunTutorRequest = parsed.data;

    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

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
      const leaked =
        draft.length === 0 ||
        mentionsAnswer(draft, req.correctAnswer, req.correctAnswerValue);
      const text = leaked ? FALLBACK_HINTS[tier] : draft;

      await trackUsage(uid, "tutorHints");
      return { text };
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
    return { text };
  },
);
