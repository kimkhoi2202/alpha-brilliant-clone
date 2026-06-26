/**
 * The locked Phase 2 model ids (PRD §2.2).
 *
 * The OpenAI client is constructed inline at each call site from the resolved
 * secret value (`defineSecret("OPENAI_API_KEY").value()`), so the key never
 * leaves the server.
 */

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
