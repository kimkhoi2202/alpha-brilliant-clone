/**
 * `useKoji` — the backend selector for Koji's TEXT chat.
 *
 * Returns the chat backend chosen by the `CHAT_BACKEND` flag:
 *  - `"realtime"` (default) → `useRealtimeVoice` (today's `gpt-realtime-2` WebRTC
 *    chat, completely unchanged),
 *  - `"responses"` → `useKojiChat` (the new `gpt-5.5` Responses-API chat).
 *
 * Both implement the identical `RealtimeVoiceApi`, so the consumer
 * (`voice-controls.tsx`) is agnostic to which one is live.
 *
 * BOTH hooks are called every render (the Rules of Hooks forbid a conditional
 * hook call), and only the selected one is returned. This is safe because each
 * backend is INERT until its own api methods are called: the realtime hook mints
 * no token / opens no session until `connect` runs (via prewarm/sendText/etc.),
 * and the chat hook creates no `KojiChatSession` until `sendText`/`coachProactively`
 * runs. The consumer only ever calls methods on the RETURNED api, so the unused
 * backend does no work.
 */
import {
  useRealtimeVoice,
  CHAT_BACKEND,
  type RealtimeVoiceApi,
  type UseRealtimeVoiceOptions,
} from "../voice";
import { useKojiChat } from "./use-koji-chat";

export function useKoji(options: UseRealtimeVoiceOptions): RealtimeVoiceApi {
  const realtime = useRealtimeVoice(options);
  const chat = useKojiChat(options);
  return CHAT_BACKEND === "responses" ? chat : realtime;
}
