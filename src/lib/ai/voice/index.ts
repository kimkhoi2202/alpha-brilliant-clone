/**
 * Realtime-voice public entry point (PRD-phase-2 §4.1).
 *
 * Re-exports the voice session wrapper, the React hook, the transcript types, and
 * the agent/tool builders so surfaces (the Koji panel today) import from one place.
 */
export {
  KojiVoiceSession,
  isVoiceSupported,
  type VoiceErrorReason,
  type VoiceMode,
  type VoicePhase,
  type VoiceSnapshot,
  type KojiVoiceSessionOptions,
} from "./session";
export {
  useRealtimeVoice,
  type RealtimeVoiceApi,
  type UseRealtimeVoiceOptions,
} from "./use-realtime-voice";
export { toTranscript, hasUserSpoken, type VoiceTranscriptEntry, type VoiceRole } from "./transcript";
export { createKojiRealtimeAgent, type CreateKojiAgentOptions } from "./agent";
export { buildRealtimeTools, summarizeToolResult } from "./tools";
export { VOICE_MODEL, VOICE_NAME, BASE_SESSION_CONFIG } from "./constants";
