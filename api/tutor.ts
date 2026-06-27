/**
 * POST /api/tutor — grounded text tutoring (PRD §4.1): progressive hints and
 * personalized wrong-answer explanations.
 *
 * Ported from `functions/src/handlers/tutor.ts` (Firebase callable → Vercel Node
 * serverless). The tutoring logic + the hint leak firewall are preserved exactly;
 * only the transport changes: a raw `Authorization: Bearer <Firebase ID token>`
 * is verified with `jose` instead of trusting the callable's `request.auth`.
 *
 * The model PHRASES; our code stays the source of truth. We pass the
 * engine-computed `correctAnswer` as grounding, but in hint mode we post-check
 * the output and never let the final answer leak (P4).
 *
 * Contract (matches src/lib/ai/client.ts): 200 JSON `{ text: string | null }`.
 *
 * OpenAI endpoint (verified against openai@6.45.0):
 *   POST /v1/responses  ⇢  client.responses.create()  → `.output_text`
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { getOpenAI, MODELS, type TextModel } from "./_lib/openai.js";
import { guardPost, readJsonBody } from "./_lib/http.js";
import type { InteractionKind } from "./_lib/content/types.js";

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

/** Tiered, answer-free Socratic fallback hints (also the AI-off safety net). */
const FALLBACK_HINTS: Record<1 | 2 | 3, string> = {
  1: "What relationship ties together the three sides of a right triangle? Picture the square built on each side.",
  2: "Bring a² + b² = c² to mind. Which sides here do you already know, and which one are you solving for?",
  3: "Set it up with your own numbers: square the sides you know and combine them as the theorem says — then take that last step yourself.",
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

/** Per-tier Socratic guidance: how far to escalate without giving the answer. */
const TIER_GUIDE: Record<1 | 2 | 3, string> = {
  1: "Tier 1: ask ONE guiding question, or name the underlying idea/relationship. No specifics, no numbers plugged in.",
  2: "Tier 2: narrow it to the relevant part of THIS problem (which sides or values matter, and why). Still a nudge, not a calculation.",
  3: "Tier 3: set it up with their own numbers and the right relationship, but STOP before the final step — leave that last move to them.",
};

function buildHintPrompt(req: RunTutorRequest, tier: 1 | 2 | 3): string {
  return [
    `Concept: ${req.concept}`,
    `Step prompt: ${req.prompt}`,
    `Interaction kind: ${req.interactionKind}`,
    `Known values: ${JSON.stringify(req.givens)}`,
    `Attempt number: ${req.attemptNumber}`,
    `Socratic hint tier: ${tier}.`,
    TIER_GUIDE[tier],
    `The correct answer is ${req.correctAnswer}. NEVER state, spell out, or strongly imply this value.`,
    "Write exactly one short, warm hint at the requested tier — prefer a guiding question that activates what they know. Do not give the final answer.",
  ].join("\n");
}

function buildExplainPrompt(req: RunTutorRequest): string {
  return [
    `Concept: ${req.concept}`,
    `Step prompt: ${req.prompt}`,
    `Interaction kind: ${req.interactionKind}`,
    `Known values: ${JSON.stringify(req.givens)}`,
    `The learner answered: ${req.learnerAnswer ?? "(no answer)"}`,
    `The correct answer is: ${req.correctAnswer} (for your reference only — do NOT state it).`,
    "In 2-3 warm sentences, name the SPECIFIC misconception their answer reveals (e.g. adding the",
    "legs instead of squaring them), then guide them toward the right approach with a nudge or a",
    "question. Do not state the final answer — leave the actual computation to them.",
  ].join("\n");
}

const HINT_SYSTEM =
  "You are Koji, a warm, Socratic math tutor. You guide with questions and nudges that build " +
  "understanding — never handing over the final answer or computing it for the learner. One hint only. No preamble.";

const EXPLAIN_SYSTEM =
  "You are Koji, a warm, Socratic math tutor. You name a learner's specific misconception kindly, " +
  "then guide them back to the right method with a nudge or question — without stating the final answer. " +
  "Reply with one short message only, no preamble. Keep it to 2-3 sentences.";

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
 * known-kind gate in `generate.ts`; rejects anything out of range.
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

/**
 * Core tutoring logic (thin HTTP wrapper below). Returns the firewall-checked
 * hint / explanation text for a validated request.
 */
async function runTutor(req: RunTutorRequest): Promise<RunTutorResponse> {
  const client = getOpenAI();

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
  return { text };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const uid = await guardPost(req, res);
  if (uid === null) return;

  const parsed = runTutorSchema.safeParse(readJsonBody(req));
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message ?? "Invalid runTutor request.",
    });
    return;
  }

  try {
    const result = await runTutor(parsed.data);
    res.status(200).json(result);
  } catch (err) {
    console.error("runTutor failed", err);
    res.status(500).json({ error: "Tutor request failed." });
  }
}
