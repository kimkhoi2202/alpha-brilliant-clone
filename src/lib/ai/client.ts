/**
 * Typed wrappers over our Firebase callable Cloud Functions (PRD-phase-2 §3.2).
 *
 * The browser NEVER talks to OpenAI directly: every model call goes through one
 * of these authenticated callables, which hold the key server-side. Realtime
 * voice later uses a short-lived ephemeral token from `mintRealtimeToken` (P6).
 *
 * AI-OFF SAFE (P1): each wrapper early-returns a safe empty result when
 * `aiEnabled()` is false, so it makes no network call and nothing can break.
 * On any runtime error it also degrades gracefully (P5), returning the same
 * safe shape so callers can fall back to Phase 1 static hints / feedback.
 */
import { httpsCallable } from "firebase/functions";

import type { AnswerValue, ProblemStep } from "../../content/types";
import { functions } from "../firebase";
import { aiEnabled } from "./flag";
import type { Grounding, GroundingGivens } from "./grounding";

// ---------------------------------------------------------------------------
// runTutor — grounded text hints + personalized wrong-answer explanations.
// ---------------------------------------------------------------------------

export type TutorRequestKind = "hint" | "explanation";

export interface RunTutorInput {
  /** "hint" for a progressive hint; "explanation" for a wrong-answer diagnosis. */
  kind: TutorRequestKind;
  /** Typed grounding payload (see `buildGrounding`). */
  grounding: Grounding;
  /** Progressive hint tier (1 names the idea … 3 sets it up). Ignored for explanations. */
  hintLevel?: 1 | 2 | 3;
}

export interface RunTutorResult {
  ok: boolean;
  /** Hint / explanation text, server-post-checked for leaks. Null = unavailable. */
  text: string | null;
}

// ---------------------------------------------------------------------------
// generateProblem — verified, schema-valid practice (Pillar B).
// ---------------------------------------------------------------------------

/** Interaction kinds generation is restricted to (PRD §3.4). */
export type GeneratableInteractionKind =
  | "numeric"
  | "count-squares"
  | "pick-side"
  | "multiple-choice"
  | "tile-expression";

/** Difficulty buckets the generator supports (mirrors the server contract). */
export type GenerationDifficulty = "easy" | "medium" | "hard";

export interface GenerateProblemInput {
  /** Which verifiable interaction kind to generate (one per call). */
  interactionKind: GeneratableInteractionKind;
  /** Difficulty (typically derived from the learner's `StepRecord`). */
  difficulty?: GenerationDifficulty;
  /** Optional seed for deterministic server-side choices (testing/repro). */
  seed?: number;
}

export interface GenerateProblemResult {
  ok: boolean;
  /**
   * Candidate problem — UNVERIFIED. Callers MUST pass this through
   * `verifyGeneratedProblem` before rendering it (P4: nothing shown unchecked).
   */
  step: ProblemStep | null;
}

// ---------------------------------------------------------------------------
// mintRealtimeToken — short-lived client secret for the browser voice session.
// ---------------------------------------------------------------------------

export interface RealtimeTokenResult {
  ok: boolean;
  /** Ephemeral client secret for the RealtimeSession; null when off/unavailable. */
  value: string | null;
  /** Realtime model id the token is scoped to, if provided. */
  model: string | null;
  /** Epoch-ms expiry, if the server provided it. */
  expiresAt: number | null;
}

const EMPTY_TUTOR_RESULT: RunTutorResult = { ok: false, text: null };
const EMPTY_GENERATE_RESULT: GenerateProblemResult = { ok: false, step: null };
const EMPTY_TOKEN_RESULT: RealtimeTokenResult = {
  ok: false,
  value: null,
  model: null,
  expiresAt: null,
};

// ---------------------------------------------------------------------------
// Wire helpers — callable responses are treated as `unknown` and normalized,
// so a skeleton / partially-implemented backend can't crash the client.
// ---------------------------------------------------------------------------

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Invoke a callable and return its data as a record, or null on any failure. */
async function callCallable(
  name: string,
  payload?: unknown,
): Promise<Record<string, unknown> | null> {
  try {
    const callable = httpsCallable<unknown, unknown>(functions, name);
    const result = await callable(payload);
    return asRecord(result.data);
  } catch {
    // Graceful fallback (P5): caller degrades to static hints / feedback.
    return null;
  }
}

// --- grounding → flat wire payload (the runTutor callable expects scalars) ---

/** Flatten the structured givens into the scalar map the callable expects. */
function flattenGivens(g: GroundingGivens): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (g.triangle) {
    out.a = g.triangle.a;
    out.b = g.triangle.b;
    if (g.triangle.orientation) out.orientation = g.triangle.orientation;
    if (g.triangle.unit) out.unit = g.triangle.unit;
  }
  if (g.visualKind) out.visual = g.visualKind;
  if (g.numeric?.unit) out.unit = g.numeric.unit;
  if (typeof g.numeric?.tolerance === "number") out.tolerance = g.numeric.tolerance;
  if (g.choices) out.choices = g.choices.map((c) => `${c.id}:${c.label}`).join(", ");
  if (g.tiles)
    out.tiles = `bank=[${g.tiles.bank.join(",")}] template=[${g.tiles.template
      .map((t) => t ?? "_")
      .join(",")}]`;
  return out;
}

/** The numeric value of a numeric/slider/count-squares answer, else undefined. */
function numericAnswerValue(answer: AnswerValue): number | undefined {
  if (
    (answer.kind === "numeric" ||
      answer.kind === "slider" ||
      answer.kind === "count-squares") &&
    typeof answer.value === "number" &&
    Number.isFinite(answer.value)
  ) {
    return answer.value;
  }
  return undefined;
}

/** Grounded text tutor: a progressive hint or a personalized explanation. */
export async function runTutor(input: RunTutorInput): Promise<RunTutorResult> {
  if (!aiEnabled()) return EMPTY_TUTOR_RESULT;
  const g = input.grounding;
  // Map the structured grounding to the callable's flat wire contract. We send a
  // HUMAN-READABLE answer (label / side name / value+unit), not internal ids, so
  // the explanation reads correctly and the server's leak check is meaningful (W1).
  // For numeric answers we ALSO send the raw value so the server can leak-check
  // by value (e.g. catch "5.0" / "5 cm"), not just the rendered text (C1).
  const correctAnswerValue = numericAnswerValue(g.correctAnswer);
  const payload = {
    concept: g.concept,
    prompt: g.prompt,
    interactionKind: g.interactionKind,
    givens: flattenGivens(g.givens),
    correctAnswer: g.correctAnswerText,
    ...(correctAnswerValue !== undefined ? { correctAnswerValue } : {}),
    learnerAnswer: g.learnerAnswerText,
    attemptNumber: g.attemptNumber,
    mode: input.kind === "explanation" ? "explain" : "hint",
    hintTier: input.hintLevel,
  };
  const data = await callCallable("runTutor", payload);
  const text = data ? asString(data.text) : null;
  return { ok: text !== null, text };
}

/** Request a verified practice problem. The result is still UNVERIFIED client-side. */
export async function generateProblem(
  input: GenerateProblemInput,
): Promise<GenerateProblemResult> {
  if (!aiEnabled()) return EMPTY_GENERATE_RESULT;
  const data = await callCallable("generateProblem", input);
  const step =
    data && asRecord(data.step) !== null ? (data.step as ProblemStep) : null;
  return { ok: step !== null, step };
}

/** Mint a short-lived realtime token for the browser voice session. */
export async function mintRealtimeToken(): Promise<RealtimeTokenResult> {
  if (!aiEnabled()) return EMPTY_TOKEN_RESULT;
  const data = await callCallable("mintRealtimeToken");
  if (!data) return EMPTY_TOKEN_RESULT;
  // The server returns exactly `token` + `expiresAt` (epoch-SECONDS).
  const value = asString(data.token);
  // Normalize the expiry to epoch-ms for the client contract.
  const expiresSec = asNumber(data.expiresAt);
  return {
    ok: value !== null,
    value,
    model: asString(data.model),
    expiresAt: expiresSec !== null ? Math.round(expiresSec * 1000) : null,
  };
}
