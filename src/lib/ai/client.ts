/**
 * Typed wrappers over our authenticated `/api` serverless endpoints (PRD-phase-2 §3.2).
 *
 * The browser NEVER talks to OpenAI directly: every model call goes through one
 * of these endpoints (POST `/api/*`), which hold the key server-side and verify
 * the caller's Firebase ID token. Realtime voice later uses a short-lived
 * ephemeral token from `mintRealtimeToken` (P6).
 *
 * AI-OFF SAFE (P1): each wrapper early-returns a safe empty result when
 * `aiEnabled()` is false, so it makes no network call and nothing can break.
 * On any runtime error it also degrades gracefully (P5), returning the same
 * safe shape so callers can fall back to Phase 1 static hints / feedback.
 */
import type { AnswerValue, ProblemStep } from "../../content/types";
import { auth } from "../firebase";
import { aiEnabled } from "./flag";
import { asRecord } from "./json";
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
// Wire helpers — endpoint responses are treated as `unknown` and normalized,
// so a skeleton / partially-implemented backend can't crash the client.
// (`asRecord` is shared via `./json`.)
// ---------------------------------------------------------------------------

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * POST a JSON payload to one of our `/api` routes and return the parsed JSON
 * body as a record, or null on ANY failure (no signed-in user, non-2xx,
 * network/parse error). We attach the caller's Firebase ID token so the
 * serverless route can authenticate the request; with no signed-in user we
 * skip the call entirely (the caller then degrades gracefully — P5).
 */
async function postJson(
  route: string,
  payload?: unknown,
): Promise<Record<string, unknown> | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    const idToken = await user.getIdToken();
    const response = await fetch(route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload ?? {}),
    });
    if (!response.ok) return null;
    return asRecord(await response.json());
  } catch {
    // Graceful fallback (P5): caller degrades to static hints / feedback.
    return null;
  }
}

// --- grounding → flat wire payload (the /api/tutor route expects scalars) ---

/** Flatten the structured givens into the scalar map the /api/tutor route expects. */
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
  // Map the structured grounding to the endpoint's flat wire contract. We send a
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
  const data = await postJson("/api/tutor", payload);
  const text = data ? asString(data.text) : null;
  return { ok: text !== null, text };
}

/** Request a verified practice problem. The result is still UNVERIFIED client-side. */
export async function generateProblem(
  input: GenerateProblemInput,
): Promise<GenerateProblemResult> {
  if (!aiEnabled()) return EMPTY_GENERATE_RESULT;
  const data = await postJson("/api/generate", input);
  const step =
    data && asRecord(data.step) !== null ? (data.step as ProblemStep) : null;
  return { ok: step !== null, step };
}

/** Mint a short-lived realtime token for the browser voice session. */
export async function mintRealtimeToken(): Promise<RealtimeTokenResult> {
  if (!aiEnabled()) return EMPTY_TOKEN_RESULT;
  const data = await postJson("/api/realtime-token");
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

// ---------------------------------------------------------------------------
// streamKojiChat — auth'd SSE wrapper for the gpt-5.5 chat backend (/api/chat).
//
// Powers the flag-gated `KojiChatSession` tool loop: POST one hop's conversation
// state, then read Koji's streamed text + the function calls he wants to run. The
// browser executes those tools locally and calls this again with their outputs.
// (Flag-gated by `CHAT_BACKEND`; the default "realtime" path never calls this.)
// ---------------------------------------------------------------------------

/** One conversation item on the wire — a subset of the Responses API `input`. */
export type ChatItem =
  | { role: "user" | "assistant" | "developer"; content: string }
  | { type: "function_call"; call_id: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; output: string };

/** A function call Koji wants the browser to run (paired back by `callId`). */
export interface KojiChatToolCall {
  callId: string;
  name: string;
  /** Raw JSON-string arguments (parsed + validated client-side before running). */
  arguments: string;
}

/** What `streamKojiChat` yields as it reads the SSE response. */
export type KojiChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; calls: KojiChatToolCall[] }
  | { type: "error"; message: string };

export interface StreamKojiChatInput {
  /** Persona + grounding (the server prepends its own immutable safety header). */
  instructions: string;
  /** The conversation so far (messages + id-paired function_call/output items). */
  items: ChatItem[];
  /** Tool names to enable; the server whitelists them against its catalog. */
  tools: { name: string }[];
}

/** Narrow one parsed SSE `data:` payload into a typed stream event (or null). */
function normalizeStreamEvent(value: unknown): KojiChatStreamEvent | null {
  const rec = asRecord(value);
  if (!rec) return null;
  if (rec.type === "delta" && typeof rec.text === "string") {
    return { type: "delta", text: rec.text };
  }
  if (rec.type === "error") {
    return {
      type: "error",
      message: typeof rec.message === "string" ? rec.message : "Koji's reply failed.",
    };
  }
  if (rec.type === "done") {
    const calls: KojiChatToolCall[] = [];
    if (Array.isArray(rec.calls)) {
      for (const entry of rec.calls) {
        const call = asRecord(entry);
        if (
          call &&
          typeof call.callId === "string" &&
          typeof call.name === "string" &&
          typeof call.arguments === "string"
        ) {
          calls.push({ callId: call.callId, name: call.name, arguments: call.arguments });
        }
      }
    }
    return { type: "done", calls };
  }
  return null;
}

/** Parse one SSE event block (`data:` lines) into a stream event or the `[DONE]` sentinel. */
function parseSseEvent(block: string): KojiChatStreamEvent | "done" | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).replace(/^ /, ""))
    .join("\n");
  if (!data) return null;
  if (data === "[DONE]") return "done";
  try {
    return normalizeStreamEvent(JSON.parse(data) as unknown);
  } catch {
    return null;
  }
}

/**
 * POST one chat hop and stream Koji's reply. Yields text deltas as they arrive,
 * then a single `done` carrying the function calls for this hop (or an `error`).
 *
 * AI-OFF / signed-out safe (P1): yields one `error` and stops without a network
 * call. An aborted request (barge-in / teardown) ends the generator SILENTLY (no
 * error), so the caller treats it as a clean cancel, not a failed turn.
 */
export async function* streamKojiChat(
  input: StreamKojiChatInput,
  signal: AbortSignal,
): AsyncGenerator<KojiChatStreamEvent> {
  if (!aiEnabled()) {
    yield { type: "error", message: "Koji is off right now." };
    return;
  }

  let idToken: string;
  try {
    const user = auth.currentUser;
    if (!user) {
      yield { type: "error", message: "Please sign in to chat with Koji." };
      return;
    }
    idToken = await user.getIdToken();
  } catch {
    yield { type: "error", message: "Couldn't authenticate — try again." };
    return;
  }

  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(input),
      signal,
    });
  } catch {
    if (signal.aborted) return;
    yield { type: "error", message: "Couldn't reach Koji — try again." };
    return;
  }

  if (!response.ok || !response.body) {
    yield { type: "error", message: "Koji's reply failed — try again." };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep = buffer.indexOf("\n\n");
      while (sep >= 0) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const event = parseSseEvent(block);
        if (event === "done") return;
        if (event) yield event;
        sep = buffer.indexOf("\n\n");
      }
    }
  } catch {
    if (signal.aborted) return;
    yield { type: "error", message: "Koji's reply was interrupted — try again." };
  }
}
