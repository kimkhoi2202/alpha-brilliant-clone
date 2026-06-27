/**
 * `useRealtimeVoice` — React bridge for the Koji voice session (PRD §4.1).
 *
 * Owns the `KojiVoiceSession` lifecycle and mirrors its `VoiceSnapshot` into
 * component state. It enforces the guardrails:
 *  - **AI-off:** when `aiEnabled()` is false it does nothing and reports
 *    `aiEnabled:false`, so no token is minted and no session is created.
 *  - **Graceful fallback:** unsupported browsers / failures surface as a typed
 *    phase the UI turns into "voice unavailable — keep going in text".
 *  - **Engagement:** the first time the learner actually speaks, it calls
 *    `onUserSpoke` once so the reveal effort-gate's "talked to Koji" path unlocks.
 *
 * The session is recreated per connect attempt (fresh token + WebRTC), so a retry
 * after an error always starts clean. A live `getContext` getter keeps the bound
 * tools acting on the learner's current step without rebuilding the session.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeItem } from "@openai/agents-realtime";

import { aiEnabled } from "../flag";
import type { Grounding } from "../grounding";
import type { ToolContext } from "../tools";
import {
  KojiVoiceSession,
  isVoiceSupported,
  klog,
  type VoiceErrorReason,
  type VoicePhase,
  type VoiceSnapshot,
} from "./session";
import type { VoiceTranscriptEntry } from "./transcript";

const INITIAL_SNAPSHOT: VoiceSnapshot = {
  phase: "idle",
  errorReason: null,
  listening: false,
  speaking: false,
  responding: false,
  transcript: [],
  userHasSpoken: false,
  turnErrorNonce: 0,
};

/**
 * Delay before a single auto-reconnect after a LIVE session drops (so the next
 * send works without the learner doing anything). Only fires once per healthy
 * session — see `autoReconnectArmedRef` — so a hard outage can't loop.
 */
const AUTO_RECONNECT_DELAY_MS = 800;

/**
 * The one-off developer/system instruction Koji is given when the learner has
 * just answered incorrectly (PROACTIVE coaching). It tells him to read the live
 * state and offer exactly ONE Socratic nudge — never the answer — mirroring his
 * standing Socratic contract in the agent prompt, just made proactive. Sent as a
 * `system` turn (see `KojiVoiceSession.sendDeveloperTurn`), so it never appears
 * as a learner bubble and never unlocks the reveal gate.
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

/**
 * Outcome of a `sendText` call, returned synchronously so the caller can react
 * to a failure immediately (revert the optimistic bubble, restore the text):
 *  - `"sent"`   — handed to a live session; on the happy path the echo dedupes
 *                 the optimistic bubble by id.
 *  - `"queued"` — the session wasn't live, so the text was queued and a connect
 *                 was kicked off; it flushes once live. A later connect failure
 *                 surfaces as `phase === "error"`, which the UI uses to revert.
 *  - `"failed"` — couldn't send AND couldn't queue (AI off / unsupported, or the
 *                 live transport rejected the send). The caller must revert.
 */
export type SendTextStatus = "sent" | "queued" | "failed";

export interface UseRealtimeVoiceOptions {
  /** Live tool-context getter (the bound tools always read the latest). */
  getContext: () => ToolContext;
  /** Called once when the learner first speaks (→ `markTalkedToKoji`). */
  onUserSpoke?: () => void;
  /**
   * Prior turns to seed each fresh session with (read at connect time), so Koji
   * resumes with the earlier conversation as context. Built via
   * `toRealtimeHistory`. Omit (or return `[]`) for a brand-new conversation.
   */
  getInitialHistory?: () => RealtimeItem[];
  /**
   * Override the agent's grounding (read at connect time). Defaults to the
   * current step's grounding. Return `null` for a free-form (lesson-level)
   * resume that isn't pinned to a specific problem.
   */
  getGrounding?: () => Grounding | null;
}

export interface RealtimeVoiceApi {
  /** Mirrors `aiEnabled()`; when false the UI must render nothing. */
  aiEnabled: boolean;
  /** Whether this browser can run WebRTC voice. */
  supported: boolean;
  phase: VoicePhase;
  errorReason: VoiceErrorReason | null;
  listening: boolean;
  speaking: boolean;
  responding: boolean;
  transcript: VoiceTranscriptEntry[];
  /**
   * Bumps on every non-fatal turn/response error (Koji's reply failed but the
   * session stays alive). The UI watches it to surface a visible, non-spammy
   * "couldn't get a reply" toast — so a broken turn is never a silent stop.
   */
  turnErrorNonce: number;
  /**
   * Enter voice mode: connect (or, if already live, just open the mic). The mic
   * then stays OPEN continuously — "open mic + tap to send" — so there's no
   * push-to-talk hold; turn-taking is driven by `sendTurn`.
   */
  startVoiceSession: () => void;
  /**
   * Commit the learner's current spoken turn and request Koji's reply (server
   * VAD is off, so this is what ends a turn). The mic stays open for the next
   * turn. No-ops unless the session is live.
   */
  sendTurn: () => void;
  /** Disconnect and free the mic. */
  endSession: () => void;
  /** Retry after a failure. */
  retry: () => void;
  /**
   * Send a typed message into the same realtime conversation. Koji answers by
   * voice and the typed turn appears in `transcript` alongside spoken turns. If
   * the session isn't live yet it connects first (without forcing the mic open)
   * and flushes the queued text once connected.
   *
   * Pass a client `id` to have the echoed user turn carry it (so an optimistic
   * on-screen bubble dedupes onto the echo by id).
   *
   * Returns a {@link SendTextStatus} so the caller can revert an optimistic turn
   * the instant a send is rejected outright (`"failed"`), rather than leaving a
   * phantom bubble waiting on an echo that will never come.
   */
  sendText: (text: string, id?: string) => SendTextStatus;
  /**
   * Fire ONE proactive coaching turn into the realtime conversation — Koji jumps
   * in (after a wrong answer) without being asked, reads the live state, and gives
   * a single Socratic nudge. It injects a developer/system instruction + exactly
   * one response request through the SAME safe path as `sendText` (single-flight
   * connect + one-response-per-turn), so it can't duplicate a reply. There's no
   * visible "user" bubble — the result reads as a normal Koji message.
   *
   * If the session isn't live yet it connects (single-flight, no mic) and fires
   * once on connect. If a response is already in flight it SKIPS (never barges in
   * or races the learner's own send). The caller is responsible for throttling it
   * to once per offer.
   */
  coachProactively: () => void;
  /**
   * Pre-warm the connection: connect now (WITHOUT opening the mic) so the first
   * send isn't blocked on the WebRTC handshake. Connects at most once, only from
   * an idle session, and only when AI is on. In text-only mode this never probes
   * or prompts for the microphone, so it's cheap to call when the panel opens.
   */
  prewarm: () => void;
}

export function useRealtimeVoice(
  options: UseRealtimeVoiceOptions,
): RealtimeVoiceApi {
  const aiOn = aiEnabled();
  const supported = useMemo(() => isVoiceSupported(), []);

  const [snapshot, setSnapshot] = useState<VoiceSnapshot>(INITIAL_SNAPSHOT);

  const sessionRef = useRef<KojiVoiceSession | null>(null);
  const markedRef = useRef(false);
  // Typed messages sent before the session is live, flushed (with their optional
  // client ids) once connected.
  const pendingTextRef = useRef<{ text: string; id?: string }[]>([]);
  // Set when voice mode is requested while a (typed-first) connect is in flight,
  // so the mic is opened the moment the session goes live.
  const wantMicOpenRef = useRef(false);
  // One-shot "send a proactive coach turn the moment we're live" flag. A boolean
  // (never a list) so it's idempotent — a repeated proactive trigger before the
  // session connects can NEVER queue two developer turns. Flushed exactly once on
  // live (see the flush effect), reset on teardown / error.
  const pendingCoachRef = useRef(false);
  // SINGLE-FLIGHT connect guard. A synchronous ref (NOT React state) so a second
  // connect() dispatched in the same tick — before the first connect's
  // "connecting" phase reaches React state (the pre-warm double-connect race) —
  // still sees it and bails. This is the core duplicate-response fix: one
  // session, one token, one `response.create` per turn.
  const connectingRef = useRef(false);
  // Armed only once a session reaches "live": a healthy session that later drops
  // gets exactly ONE silent auto-reconnect (so the next send works); a
  // never-live failure can't loop.
  const autoReconnectArmedRef = useRef(false);

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

  // Fire the engagement signal exactly once, on the learner's first utterance.
  useEffect(() => {
    if (snapshot.userHasSpoken && !markedRef.current) {
      markedRef.current = true;
      onUserSpokeRef.current?.();
    }
  }, [snapshot.userHasSpoken]);

  const teardown = useCallback(() => {
    klog("teardown");
    sessionRef.current?.close();
    sessionRef.current = null;
    markedRef.current = false;
    pendingTextRef.current = [];
    pendingCoachRef.current = false;
    wantMicOpenRef.current = false;
    connectingRef.current = false;
    autoReconnectArmedRef.current = false;
    setSnapshot(INITIAL_SNAPSHOT);
  }, []);

  const connect = useCallback(
    (startListening = true, reason = "unknown") => {
      if (!aiOn || !supported) return;
      const existingPhase = sessionRef.current?.snapshot.phase;
      // SINGLE-FLIGHT: never spawn a second session while one is already in
      // flight, connecting, or live. The `connectingRef` guard is synchronous, so
      // a connect() dispatched before the first one's "connecting" phase reaches
      // React state still bails here (the pre-warm double-connect race).
      if (
        connectingRef.current ||
        existingPhase === "connecting" ||
        existingPhase === "live"
      ) {
        klog("connect skipped (single-flight)", {
          reason,
          inFlight: connectingRef.current,
          existingPhase,
        });
        return;
      }
      connectingRef.current = true;
      klog("connect()", { reason, startListening });
      // Fresh session per attempt (covers retry / auto-reconnect after an error).
      sessionRef.current?.close();
      markedRef.current = false;
      const ctx = getContextRef.current();
      // Free-form resume can override grounding with null; otherwise ground to the
      // learner's current step exactly as before.
      const grounding = getGroundingRef.current
        ? getGroundingRef.current()
        : (ctx.step?.grounding() ?? null);
      const session = new KojiVoiceSession({
        getContext: () => getContextRef.current(),
        grounding,
        onChange: setSnapshot,
        // Prior turns to prime the session (resume / continue), or [] for new.
        initialHistory: getInitialHistoryRef.current?.() ?? [],
      });
      sessionRef.current = session;
      klog("connect: new session", { reason, session: session.id });
      // Clear the in-flight guard once the attempt settles (live OR error); after
      // that the session's own phase guards re-entry and the auto-reconnect effect
      // can act on an error.
      void session.connect(startListening).finally(() => {
        connectingRef.current = false;
      });
    },
    [aiOn, supported],
  );

  const prewarm = useCallback(() => {
    if (!aiOn || !supported) return;
    // Connect at most once, only from idle (never tear down a live/connecting
    // session or auto-retry after an error). Text-only connect opens no mic. The
    // single-flight guard in `connect` is the real safety net for the race.
    if (snapshot.phase !== "idle") return;
    connect(false, "prewarm");
  }, [aiOn, supported, snapshot.phase, connect]);

  const startVoiceSession = useCallback(() => {
    if (!aiOn || !supported) return;
    // Open-mic model: entering voice mode opens the mic and keeps it open. If a
    // session is already live (e.g. after a typed turn) just open the mic; if a
    // connect is in flight, remember to open the mic the moment it goes live;
    // otherwise connect fresh with the mic open.
    const session = sessionRef.current;
    if (snapshot.phase === "live" && session) {
      session.setListening(true);
      return;
    }
    if (snapshot.phase === "connecting") {
      wantMicOpenRef.current = true;
      return;
    }
    connect(true, "voice");
  }, [aiOn, supported, snapshot.phase, connect]);

  const sendTurn = useCallback(() => {
    if (!aiOn || !supported) return;
    const session = sessionRef.current;
    if (snapshot.phase !== "live" || !session) return;
    session.commitTurn();
  }, [aiOn, supported, snapshot.phase]);

  const endSession = useCallback(() => {
    teardown();
  }, [teardown]);

  const retry = useCallback(() => {
    connect(true, "retry");
  }, [connect]);

  const sendText = useCallback(
    (text: string, id?: string): SendTextStatus => {
      const trimmed = text.trim();
      if (!trimmed || !aiOn || !supported) return "failed";
      // Typing to Koji is engagement — unlock the reveal "talked to Koji" path.
      getContextRef.current().engagement.markTalkedToKoji();
      const session = sessionRef.current;
      if (session && snapshot.phase === "live") {
        // Live: hand it straight to the session. A transport throw makes
        // `session.sendText` return false → report "failed" so the caller
        // reverts (this is the silent-failure path — no error phase fires).
        const ok = session.sendText(trimmed, id);
        klog("sendText (live)", { id, ok, session: session.id });
        return ok ? "sent" : "failed";
      }
      // Not connected yet: queue it (keeping its id) and kick a SINGLE-FLIGHT
      // connect (no mic — the learner is typing). The flush effect sends it once
      // on live; the single-flight guard means this can never spawn a second
      // session even if a pre-warm connect is already in flight. A connect
      // failure later surfaces as phase "error" → the UI reverts then.
      pendingTextRef.current.push({ text: trimmed, id });
      klog("sendText queued (not live)", { id, phase: snapshot.phase });
      connect(false, "send");
      return "queued";
    },
    [aiOn, supported, snapshot.phase, connect],
  );

  const coachProactively = useCallback(() => {
    if (!aiOn || !supported) {
      klog("coachProactively: skipped (ai off / unsupported)");
      return;
    }
    // Read the LIVE session snapshot (updated synchronously by the session via
    // #patch), not the React `snapshot` (which lags a render) — so the
    // in-flight / phase decision below is never stale.
    const session = sessionRef.current;
    const phase = session?.snapshot.phase;
    if (session && phase === "live") {
      // Live: NEVER barge in on an in-flight reply — skip, so the proactive nudge
      // can't cut Koji off mid-answer or race the learner's own just-sent turn.
      if (session.snapshot.responding || session.snapshot.speaking) {
        klog("coachProactively: skipped-because-inflight", {
          session: session.id,
        });
        return;
      }
      const ok = session.sendDeveloperTurn(PROACTIVE_COACH_INSTRUCTION);
      klog("coachProactively: fired (live)", { ok, session: session.id });
      return;
    }
    // Not live yet: arm the one-shot flag (idempotent — a second trigger can't
    // queue two) and kick a SINGLE-FLIGHT connect (no mic; text-only friendly).
    // The flush effect sends it exactly once on live; the connect guard means
    // this can never spawn a second session even if a pre-warm connect is already
    // in flight (that was the dup bug). A later connect failure clears the flag
    // via the error effect, so it won't fire surprise-late.
    if (pendingCoachRef.current) {
      klog("coachProactively: skipped-because-already-pending");
      return;
    }
    pendingCoachRef.current = true;
    klog("coachProactively: queued (not live)", { phase: phase ?? "none" });
    connect(false, "coach");
  }, [aiOn, supported, connect]);

  // The moment the session goes live: open the mic if voice mode was requested
  // mid-connect, then flush any text queued before it connected (exactly once —
  // the queue is emptied before sending, so a re-run can't double-send).
  useEffect(() => {
    if (snapshot.phase !== "live") return;
    const session = sessionRef.current;
    if (!session) return;
    if (wantMicOpenRef.current) {
      wantMicOpenRef.current = false;
      session.setListening(true);
    }
    if (pendingTextRef.current.length > 0) {
      const queued = pendingTextRef.current;
      pendingTextRef.current = [];
      klog("flush queued sends on live", {
        count: queued.length,
        session: session.id,
      });
      for (const item of queued) session.sendText(item.text, item.id);
    }
    // Proactive coach turn queued before connect: send it exactly once now. It's
    // sent AFTER any queued user text so a real typed question is answered first;
    // the response sequencer serializes both, so neither produces a duplicate or
    // concurrent reply. The flag is cleared BEFORE sending, so even a re-run of
    // this effect can't double-send. (A fresh session isn't responding yet, so
    // the guard normally passes; it only skips if a reply is somehow already in
    // flight.)
    if (pendingCoachRef.current) {
      pendingCoachRef.current = false;
      if (!session.snapshot.responding && !session.snapshot.speaking) {
        const ok = session.sendDeveloperTurn(PROACTIVE_COACH_INSTRUCTION);
        klog("coachProactively: fired (flush on live)", {
          ok,
          session: session.id,
        });
      } else {
        klog("coachProactively: skipped-because-inflight (flush)", {
          session: session.id,
        });
      }
    }
  }, [snapshot.phase]);

  // No silent death: when a LIVE session drops into an error, the UI surfaces it
  // (the toast keyed on phase "error") AND we auto-reconnect ONCE so the next
  // send works without the learner doing anything. Armed only by reaching "live"
  // (re-armed per healthy session), so a never-live failure can't loop. Queued
  // sends are dropped on error — the UI already restored their text via the
  // optimistic revert — so a reconnect never silently re-sends them.
  useEffect(() => {
    if (snapshot.phase === "live") {
      autoReconnectArmedRef.current = true;
      return;
    }
    if (snapshot.phase !== "error") return;
    pendingTextRef.current = [];
    // Drop any pending proactive coach turn on error too — it's best-effort, so a
    // failed connect quietly skips it rather than firing a surprise-late nudge
    // after an auto-reconnect.
    pendingCoachRef.current = false;
    const reason = snapshot.errorReason;
    const recoverable = reason === "connection" || reason === "token";
    if (!recoverable || !autoReconnectArmedRef.current) {
      klog("auto-reconnect: skipped", {
        reason,
        armed: autoReconnectArmedRef.current,
      });
      return;
    }
    autoReconnectArmedRef.current = false;
    klog("auto-reconnect: scheduling", { reason, delayMs: AUTO_RECONNECT_DELAY_MS });
    const timer = window.setTimeout(
      () => connect(false, "auto-reconnect"),
      AUTO_RECONNECT_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [snapshot.phase, snapshot.errorReason, connect]);

  // Close the session (and free the mic) when the surface unmounts — e.g. the
  // Koji panel closes or the learner advances to the next step.
  useEffect(() => () => teardown(), [teardown]);

  return {
    aiEnabled: aiOn,
    supported,
    phase: snapshot.phase,
    errorReason: snapshot.errorReason,
    listening: snapshot.listening,
    speaking: snapshot.speaking,
    responding: snapshot.responding,
    transcript: snapshot.transcript,
    turnErrorNonce: snapshot.turnErrorNonce,
    startVoiceSession,
    sendTurn,
    endSession,
    retry,
    sendText,
    coachProactively,
    prewarm,
  };
}
