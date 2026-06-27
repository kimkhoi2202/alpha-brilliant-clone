/**
 * Voice mode flag — the single switch that puts Koji in TEXT-ONLY mode.
 *
 * While voice capture is unreliable, Koji runs text-only. When `VOICE_ENABLED`
 * is `false` (the current default) everything voice-related is gated off:
 *  - the composer is just a text input + a send button (no mic, no mic↔send
 *    morph, no way to enter voice mode),
 *  - Koji's realtime replies are restricted to text — nothing is spoken
 *    (`outputModalities: ["text"]` in `constants.ts`),
 *  - connecting never opens or prompts for the microphone (`session.ts` hands
 *    the WebRTC transport a synthetic silent track instead of `getUserMedia`).
 *
 * Flipping this back to `true` fully restores the original voice behavior
 * (open-mic turn-taking, the mic↔send morph, and Koji's spoken replies). The
 * voice code is kept intact behind this flag, not deleted.
 *
 * Typed as `boolean` (not the literal `false`) on purpose: it keeps the gated
 * voice branches reachable for the type-checker so they don't read as dead code
 * or trip unused-symbol diagnostics while the flag is off.
 */
export const VOICE_ENABLED: boolean = false;

/**
 * Which backend powers Koji's TEXT chat (PRD-phase-2 follow-up: re-platforming
 * the chat onto gpt-5.5).
 *
 *  - `"realtime"` — the ORIGINAL behavior (the default). Koji's text chat rides
 *    the `@openai/agents-realtime` WebRTC session on `gpt-realtime-2`
 *    (`use-realtime-voice.ts` / `session.ts`), exactly as it does today.
 *  - `"responses"` — the new, flag-gated backend. Koji's text chat runs on the
 *    flagship `gpt-5.5` via the raw Responses API with a CLIENT-DRIVEN tool loop
 *    (`api/chat.ts` + `src/lib/ai/chat/*`). gpt-5.5 is not realtime-capable, so
 *    it can't use the WebRTC path; the tool loop runs Koji's tools client-side.
 *
 * `useKoji` (the selector swapped into `voice-controls.tsx`) reads this to pick
 * the backend. The voice path itself is unaffected either way — spoken voice
 * always stays on `gpt-realtime-2` (it's a separate, dual-backend concern).
 *
 * DEFAULT `"realtime"`, so flipping this on is fully opt-in and the current chat
 * stays byte-for-byte unchanged until we deliberately verify + cut over.
 *
 * Typed as the `ChatBackend` union (not a single literal) on purpose: it keeps
 * BOTH selector branches reachable for the type-checker, so neither reads as
 * dead code while the flag sits at its default — mirroring `VOICE_ENABLED`.
 */
export type ChatBackend = "realtime" | "responses";

/** Active chat backend. Flip to `"responses"` to test the gpt-5.5 chat. */
export const CHAT_BACKEND: ChatBackend = "realtime";
