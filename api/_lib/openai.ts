/**
 * Server-side OpenAI client + locked model ids — ported from
 * `functions/src/shared/openai.ts` + `functions/src/shared/secrets.ts`.
 *
 * The long-lived API key is read from `process.env.OPENAI_API_KEY` and never
 * leaves the server (P6). On Vercel this is a project Environment Variable (the
 * Firebase Functions secret equivalent); it must NOT be `VITE_`-prefixed so it
 * can never be bundled into the client.
 */
import OpenAI from "openai";

/** Locked model ids for Phase 2 (PRD §2.2). */
export const MODELS = {
  /** Flagship text + structured-output generation. */
  text: "gpt-5.5",
  /** Hints — unified on the flagship gpt-5.5 (no longer the mini model). */
  hintMini: "gpt-5.5",
  /**
   * Realtime chat/coach session model. MUST be realtime-capable: gpt-5.5 mints a
   * client secret but its live WebRTC session fails ("Failed to parse
   * SessionDescription"), so the chat stays on gpt-realtime-2. Putting the chat on
   * gpt-5.5 requires re-platforming it onto the Responses API (not a model swap).
   */
  realtime: "gpt-realtime-2",
} as const;

export type TextModel = typeof MODELS.text | typeof MODELS.hintMini;

/**
 * Resolve the realtime model id. Defaults to the locked `MODELS.realtime`
 * (`gpt-realtime-2`, the same id the Cloud Function used) but can be overridden
 * via the optional `OPENAI_REALTIME_MODEL` env var without a code change.
 */
export function realtimeModel(): string {
  return process.env.OPENAI_REALTIME_MODEL ?? MODELS.realtime;
}

/**
 * Construct an OpenAI client from the server-side key. Throws if the key is not
 * configured (the handler maps the throw to a 500 — and the client degrades
 * gracefully to its Phase-1 static fallback, P5).
 */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}
