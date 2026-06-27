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

import { VOICE_ENABLED } from "./flags";

/**
 * The model the realtime chat/coach session runs on. Must be realtime-capable
 * (gpt-5.5 mints a token but its WebRTC session fails to negotiate), so this
 * stays gpt-realtime-2. The server scopes the ephemeral token to a model; we
 * prefer that (MODELS.realtime), falling back to this.
 */
export const VOICE_MODEL = "gpt-realtime-2";

/**
 * Text-only output modality (used while `VOICE_ENABLED` is false). Restricting
 * `outputModalities` to `["text"]` makes Koji answer in text with no spoken
 * audio. The SDK defaults `output_modalities` to `["audio"]` when this is
 * omitted (see `DEFAULT_OPENAI_REALTIME_SESSION_CONFIG` in
 * `@openai/agents-realtime`), so leaving it unset in voice mode restores
 * spoken replies untouched.
 */
const TEXT_ONLY_OUTPUT: ("text" | "audio")[] = ["text"];

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
 *   transcript and the "talked to Koji" engagement signal. With manual turns it
 *   runs when the input buffer is committed, so spoken turns still land in the
 *   unified chat + persisted history.
 * - `turnDetection: null` disables server-side VAD: the learner's turn boundary
 *   is MANUAL — the "send" button commits the buffered mic audio and requests a
 *   response (see `KojiVoiceSession.commitTurn`). This is the OpenAI Realtime
 *   API's documented "open mic + tap to send" / push-to-talk shape; the SDK
 *   forwards `null` verbatim (`buildTurnDetectionConfig(null) → turn_detection:
 *   null`), so the server never auto-ends a turn.
 * - `noiseReduction: near_field` suits a phone held close to the mouth.
 * - `output.voice` is Koji's warm voice.
 *
 * The mic stays OPEN for the whole live session (always listening); turn-taking
 * is driven entirely by the manual commit, not by muting between turns.
 *
 * - `outputModalities` is pinned to text while `VOICE_ENABLED` is false, so Koji
 *   replies in text only (no audio). In voice mode it's omitted, falling back to
 *   the SDK's `["audio"]` default — i.e. today's spoken behavior, unchanged.
 *   (The `audio.input`/`audio.output` block is kept as-is either way: with
 *   text-only output the mic is silent and uncommitted, so input transcription
 *   never fires and the output voice is simply unused.)
 */
export const BASE_SESSION_CONFIG: Partial<RealtimeSessionConfig> = {
  ...(VOICE_ENABLED ? {} : { outputModalities: TEXT_ONLY_OUTPUT }),
  audio: {
    input: {
      transcription: { model: TRANSCRIPTION_MODEL, language: "en" },
      turnDetection: null,
      noiseReduction: { type: "near_field" },
    },
    output: { voice: VOICE_NAME, speed: 1 },
  },
};
