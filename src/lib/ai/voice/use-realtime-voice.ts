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

import { aiEnabled } from "../flag";
import type { ToolContext } from "../tools";
import {
  KojiVoiceSession,
  isVoiceSupported,
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
};

export interface UseRealtimeVoiceOptions {
  /** Live tool-context getter (the bound tools always read the latest). */
  getContext: () => ToolContext;
  /** Called once when the learner first speaks (→ `markTalkedToKoji`). */
  onUserSpoke?: () => void;
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
  /** Hands-free (always-listening) vs tap-to-talk. */
  handsFree: boolean;
  /** Primary mic action: connect when idle/error, else toggle the mic. */
  toggleMic: () => void;
  /** Toggle hands-free / always-listening. */
  setHandsFree: (on: boolean) => void;
  /** Barge-in: stop Koji talking. */
  stopSpeaking: () => void;
  /** Disconnect and free the mic. */
  endSession: () => void;
  /** Retry after a failure. */
  retry: () => void;
}

export function useRealtimeVoice(
  options: UseRealtimeVoiceOptions,
): RealtimeVoiceApi {
  const aiOn = aiEnabled();
  const supported = useMemo(() => isVoiceSupported(), []);

  const [snapshot, setSnapshot] = useState<VoiceSnapshot>(INITIAL_SNAPSHOT);
  const [handsFree, setHandsFreeState] = useState(false);

  const sessionRef = useRef<KojiVoiceSession | null>(null);
  const markedRef = useRef(false);

  // Latest callbacks/getters without rebuilding the session.
  const getContextRef = useRef(options.getContext);
  const onUserSpokeRef = useRef(options.onUserSpoke);
  useEffect(() => {
    getContextRef.current = options.getContext;
    onUserSpokeRef.current = options.onUserSpoke;
  });

  // Fire the engagement signal exactly once, on the learner's first utterance.
  useEffect(() => {
    if (snapshot.userHasSpoken && !markedRef.current) {
      markedRef.current = true;
      onUserSpokeRef.current?.();
    }
  }, [snapshot.userHasSpoken]);

  const teardown = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    markedRef.current = false;
    setSnapshot(INITIAL_SNAPSHOT);
  }, []);

  const connect = useCallback(() => {
    if (!aiOn || !supported) return;
    // Fresh session per attempt (covers retry after an error too).
    sessionRef.current?.close();
    markedRef.current = false;
    const ctx = getContextRef.current();
    const session = new KojiVoiceSession({
      getContext: () => getContextRef.current(),
      grounding: ctx.step?.grounding() ?? null,
      mode: handsFree ? "hands-free" : "tap",
      onChange: setSnapshot,
    });
    sessionRef.current = session;
    void session.connect(true);
  }, [aiOn, supported, handsFree]);

  const toggleMic = useCallback(() => {
    if (snapshot.phase === "connecting") return;
    const session = sessionRef.current;
    if (snapshot.phase === "live" && session) {
      session.setListening(!snapshot.listening);
      return;
    }
    connect();
  }, [connect, snapshot.phase, snapshot.listening]);

  const setHandsFree = useCallback(
    (on: boolean) => {
      setHandsFreeState(on);
      const session = sessionRef.current;
      if (!session) return;
      session.setMode(on ? "hands-free" : "tap");
      // Enabling opens the mic continuously; disabling closes it (tap idle).
      if (snapshot.phase === "live") session.setListening(on);
    },
    [snapshot.phase],
  );

  const stopSpeaking = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);

  const endSession = useCallback(() => {
    teardown();
  }, [teardown]);

  const retry = useCallback(() => {
    connect();
  }, [connect]);

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
    handsFree,
    toggleMic,
    setHandsFree,
    stopSpeaking,
    endSession,
    retry,
  };
}
