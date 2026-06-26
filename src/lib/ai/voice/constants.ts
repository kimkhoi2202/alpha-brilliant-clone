/**
 * Realtime-voice constants (PRD-phase-2 §3.2 / §4.1).
 *
 * Centralizes the model id, Koji's warm voice, and the base session config so
 * the agent, the session wrapper, and any future surface all speak with one
 * configuration. These are plain values (no SDK imports) so they stay cheap to
 * import from anywhere, including non-voice code.
 *
 * The session config is camelCase; the SDK normalizes it to the Realtime API's
 * snake_case payload when it connects (see `clientMessages` in
 * `@openai/agents-realtime`).
 */
import type { RealtimeSessionConfig } from "@openai/agents-realtime";

/**
 * The GA speech-to-speech model the voice tutor runs on (PRD §2.2). The server
 * scopes the ephemeral token to a model; we prefer that, falling back to this.
 */
export const VOICE_MODEL = "gpt-realtime-2";

/**
 * Koji's voice. `marin` is one of the newer GA realtime voices — warm and
 * encouraging, matching the persona (PRD §4.1 "warm voice"). Configurable here
 * so design can retune it in one place.
 */
export const VOICE_NAME = "marin";

/** User-speech transcription model — small + cheap; drives the live transcript. */
const TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";

/**
 * Base session config shared by every connection.
 *
 * - `transcription` turns the learner's speech into text for the on-screen live
 *   transcript and the "talked to Koji" engagement signal.
 * - `turnDetection` is server-side semantic VAD with `interruptResponse` on, so
 *   the learner can naturally barge in over Koji (PRD §4.1 barge-in).
 * - `noiseReduction: near_field` suits a phone held close to the mouth.
 * - `output.voice` is Koji's warm voice.
 *
 * Tap-to-talk vs hands-free is handled by muting the mic between turns (see
 * `KojiVoiceSession`), not by reconfiguring turn detection — so this single
 * config serves both modes.
 */
export const BASE_SESSION_CONFIG: Partial<RealtimeSessionConfig> = {
  audio: {
    input: {
      transcription: { model: TRANSCRIPTION_MODEL },
      turnDetection: { type: "semantic_vad", interruptResponse: true },
      noiseReduction: { type: "near_field" },
    },
    output: { voice: VOICE_NAME, speed: 1 },
  },
};
