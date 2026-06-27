/**
 * `useKojiChat` — React bridge for the gpt-5.5 chat backend (the flag-gated
 * Responses-API path). It implements the SAME `RealtimeVoiceApi` contract as
 * `useRealtimeVoice`, so `useKoji` can swap one for the other and the unified
 * Koji chat surface (`voice-controls.tsx`) keeps working unchanged — same
 * transcript shape, the user turn carrying the optimistic client id, the
 * "thinking…" cue, error-revert, and conversation persistence all ride along.
 *
 * It owns a single `KojiChatSession` (created lazily on the first turn) and
 * mirrors its snapshot into state. Because the chat is stateless HTTP (no
 * connection to mint), the connection lifecycle collapses to nothing: `phase`
 * is `"live"` whenever AI is on, the voice-only surface (`startVoiceSession`,
 * `sendTurn`, `prewarm`, `retry`) are no-ops, and `listening`/`speaking` are
 * always false. A failed turn surfaces (recoverably) via `turnErrorNonce` — the
 * session stays usable and the learner's question stays on screen — rather than a
 * fatal `phase:"error"` (which is the realtime backend's connection-loss signal,
 * and would wrongly trigger the optimistic-turn revert here).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { aiEnabled } from "../flag";
import type {
  RealtimeVoiceApi,
  SendTextStatus,
  UseRealtimeVoiceOptions,
} from "../voice/use-realtime-voice";
import { clog, KojiChatSession, type ChatSnapshot } from "./chat-session";

/**
 * The proactive-coaching instruction Koji is given after a first wrong answer.
 * VERBATIM copy of `PROACTIVE_COACH_INSTRUCTION` in `use-realtime-voice.ts`
 * (which must stay UNTOUCHED for the dual-backend voice path), appended here as a
 * DEVELOPER-role item to `items[]` ONLY — never rendered or persisted. Keep the
 * two copies in sync if the coaching contract ever changes.
 */
const PROACTIVE_COACH_INSTRUCTION =
  "[Proactive coaching moment] The learner just submitted their FIRST INCORRECT " +
  "answer to the current problem, so step in now without being asked. " +
  "FIRST, call readState to see their exact current answer (and that it is not " +
  "right yet) — reason from that REAL answer, never a guess. " +
  "NEXT, before you speak, draw their eye to what matters: call listCanvasTargets " +
  "and then PROACTIVELY HIGHLIGHT the relevant diagram element(s) for THIS mistake " +
  "with highlightElement (and/or pointToElement). These are silent actions, not " +
  "your reply, so do them whenever a figure is on screen — but pace yourself and " +
  "do not highlight the final answer part outright. Never announce or narrate these " +
  'silent actions (no "let me take a look", no "I\'ll highlight that") — just do them. ' +
  "FINALLY, reply with EXACTLY ONE short, warm, PERSONALIZED message (no preamble or " +
  "filler — just the single question) that " +
  "references their specific answer (what they actually picked, typed, or plotted) " +
  "and asks a single Socratic question that helps them notice their own mistake " +
  "and take the next step themselves. Never say or compute the answer or the " +
  "target value, and never flatly state which specific part is right or wrong — " +
  "keep it to that one guiding question, as if you just noticed the miss and came " +
  "over to help. Do not reveal the answer.";

const INITIAL_SNAPSHOT: ChatSnapshot = {
  transcript: [],
  responding: false,
  turnErrorNonce: 0,
};

/** Defensive fallback id for a user turn (the composer normally supplies one). */
function fallbackTurnId(): string {
  let body = "";
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      body = crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    // fall through to the manual scheme
  }
  if (!body) {
    body = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
  return `item_${body.slice(0, 24)}`;
}

export function useKojiChat(options: UseRealtimeVoiceOptions): RealtimeVoiceApi {
  const aiOn = aiEnabled();
  const [snapshot, setSnapshot] = useState<ChatSnapshot>(INITIAL_SNAPSHOT);

  const sessionRef = useRef<KojiChatSession | null>(null);
  // Fires the one-shot first-speech signal (→ `markTalkedToKoji`) once per mount.
  const markedRef = useRef(false);

  // Latest callbacks/getters without rebuilding the session.
  const getContextRef = useRef(options.getContext);
  const onUserSpokeRef = useRef(options.onUserSpoke);
  const getInitialHistoryRef = useRef(options.getInitialHistory);
  const getGroundingRef = useRef(options.getGrounding);
  useEffect(() => {
    getContextRef.current = options.getContext;
    onUserSpokeRef.current = options.onUserSpoke;
    getInitialHistoryRef.current = options.getInitialHistory;
    getGroundingRef.current = options.getGrounding;
  });

  // Lazily create the session on first use, so an idle (non-selected) instance of
  // this hook does ZERO work — the default realtime backend mounts this hook too.
  //
  // CRITICAL: never reuse a CLOSED session. `close()` runs from the unmount
  // cleanup; if a closed session were ever read again, its `runUserTurn` would
  // no-op and the send would silently vanish (no bubble, no fetch — the
  // "stuck after the first turn" bug). Recreating on `isClosed` guarantees every
  // send/coach runs on a live session.
  const getSession = useCallback((): KojiChatSession => {
    const existing = sessionRef.current;
    if (existing && !existing.isClosed) return existing;
    clog("getSession: creating session", {
      replacingClosed: existing?.isClosed ?? false,
    });
    const session = new KojiChatSession({
      getContext: () => getContextRef.current(),
      // Mirror the voice connect logic: an explicit grounding getter can override
      // (free-form resume → null); otherwise ground to the current step.
      getGrounding: () =>
        getGroundingRef.current
          ? getGroundingRef.current()
          : (getContextRef.current().step?.grounding() ?? null),
      getInitialHistory: () => getInitialHistoryRef.current?.() ?? [],
      onChange: setSnapshot,
    });
    sessionRef.current = session;
    return session;
  }, []);

  const sendText = useCallback(
    (text: string, id?: string): SendTextStatus => {
      const trimmed = text.trim();
      if (!trimmed || !aiOn) {
        clog("sendText: failed (empty / ai off)", { aiOn, hasText: !!trimmed });
        return "failed";
      }
      // Wrap the whole hand-off so an unexpected throw can NEVER vanish the turn
      // silently (the bug class: composer cleared, no bubble, no fetch). On a throw
      // we log it and return "failed", so the composer restores the typed text +
      // toasts, and the chat stays usable.
      try {
        // Typing to Koji is engagement — unlock the reveal "talked to Koji" path,
        // and fire the one-shot first-speech signal (mirrors the voice hook).
        getContextRef.current().engagement.markTalkedToKoji();
        if (!markedRef.current) {
          markedRef.current = true;
          onUserSpokeRef.current?.();
        }
        const turnId = id ?? fallbackTurnId();
        clog("sendText → runUserTurn", { id: turnId });
        // The turn runs asynchronously; the user bubble is added under `id` so the
        // optimistic on-screen bubble dedupes onto it. There's no connection to
        // wait on, so a successful hand-off is always "sent".
        getSession().runUserTurn(trimmed, turnId);
        return "sent";
      } catch (err) {
        clog("sendText THREW", {
          error: err instanceof Error ? err.message : String(err),
        });
        return "failed";
      }
    },
    [aiOn, getSession],
  );

  const coachProactively = useCallback(() => {
    if (!aiOn) return;
    const session = getSession();
    // Single-flight: never start a proactive turn while one is already running, so
    // it can't race or duplicate the learner's own in-flight reply.
    if (session.inFlight) {
      clog("coachProactively: skipped (in flight)");
      return;
    }
    clog("coachProactively: fired");
    session.runCoachTurn(PROACTIVE_COACH_INSTRUCTION);
  }, [aiOn, getSession]);

  const endSession = useCallback(() => {
    clog("endSession");
    sessionRef.current?.cancel();
  }, []);

  const noop = useCallback(() => {}, []);

  // Tear down on unmount: cancel any in-flight reply and drop the session, so a
  // remount (new chat / resumed conversation) starts clean.
  useEffect(
    () => () => {
      clog("hook unmount → close session");
      sessionRef.current?.close();
      sessionRef.current = null;
    },
    [],
  );

  return {
    aiEnabled: aiOn,
    supported: aiOn,
    // No connection to establish: live whenever AI is on, idle otherwise.
    phase: aiOn ? "live" : "idle",
    errorReason: null,
    listening: false,
    speaking: false,
    responding: snapshot.responding,
    transcript: snapshot.transcript,
    turnErrorNonce: snapshot.turnErrorNonce,
    startVoiceSession: noop,
    sendTurn: noop,
    endSession,
    retry: noop,
    sendText,
    coachProactively,
    prewarm: noop,
  };
}
