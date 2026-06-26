/**
 * OpenAI client factory + the locked Phase 2 model ids (PRD §2.2).
 *
 * The key never leaves the server: callers pass the resolved secret value from
 * `defineSecret("OPENAI_API_KEY").value()` and we build a per-invocation client.
 */
import OpenAI from "openai";

/** Locked model ids for Phase 2 (PRD §2.2). */
export const MODELS = {
  /** Flagship text + structured-output generation. */
  text: "gpt-5.5",
  /** Cheap, fast Tier-1 hints to control cost. */
  hintMini: "gpt-5.4-mini",
  /** GA speech-to-speech realtime voice model. */
  realtime: "gpt-realtime-2",
} as const;

export type TextModel = typeof MODELS.text | typeof MODELS.hintMini;

/** Build an OpenAI client from a resolved secret value (server-side only). */
export function makeOpenAI(apiKey: string): OpenAI {
  return new OpenAI({ apiKey });
}
