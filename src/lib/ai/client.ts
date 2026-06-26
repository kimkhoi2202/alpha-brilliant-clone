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

import type { ProblemStep } from "../../content/types";
import { functions } from "../firebase";
import { aiEnabled } from "./flag";
import type { Grounding } from "./grounding";

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

export type GenerationDifficulty = "intro" | "easy" | "medium" | "hard";

export interface GenerateProblemInput {
  /** Difficulty (typically derived from the learner's `StepRecord`). */
  difficulty: GenerationDifficulty;
  /** Restrict to specific verifiable kinds (server applies defaults otherwise). */
  allowedKinds?: GeneratableInteractionKind[];
  /** Concept seed (defaults to the course concept server-side). */
  concept?: string;
  /** Optional grounding from a recent step to steer style / difficulty. */
  grounding?: Grounding;
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

/** Grounded text tutor: a progressive hint or a personalized explanation. */
export async function runTutor(input: RunTutorInput): Promise<RunTutorResult> {
  if (!aiEnabled()) return EMPTY_TUTOR_RESULT;
  const data = await callCallable("runTutor", input);
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
  const value =
    asString(data.value) ?? asString(data.token) ?? asString(data.client_secret);
  return {
    ok: value !== null,
    value,
    model: asString(data.model),
    expiresAt: asNumber(data.expiresAt) ?? asNumber(data.expires_at),
  };
}
