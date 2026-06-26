/**
 * `KojiVoiceSession` — a thin, framework-agnostic wrapper around the SDK's
 * `RealtimeSession` (PRD-phase-2 §3.2 realtime data flow).
 *
 * Responsibilities:
 *  - Mint a short-lived ephemeral token via `mintRealtimeToken` and open a WebRTC
 *    `RealtimeSession` with `gpt-realtime-2`. The long-lived key never reaches the
 *    browser (P6) — only the ephemeral client secret is used here.
 *  - Surface a single immutable `VoiceSnapshot` (phase, mic/listening, speaking,
 *    responding, transcript, first-speech) via an `onChange` callback, so a React
 *    hook can mirror it into state.
 *  - Drive tap-to-talk vs hands-free purely by muting the mic between turns; in
 *    tap-to-talk the mic auto-closes once the learner's turn ends.
 *  - Support barge-in (`interrupt`) so the learner can talk over Koji.
 *  - Degrade gracefully: token / mic-permission / connection failures resolve to
 *    a typed error phase instead of throwing (P5).
 *
 * The tools bound to the agent read a *live* `ToolContext` getter, so a single
 * long-lived session always acts on the learner's current step/answer/engagement.
 */
import { RealtimeSession } from "@openai/agents-realtime";

import { mintRealtimeToken } from "../client";
import type { Grounding } from "../grounding";
import type { ToolContext } from "../tools";
import { createKojiRealtimeAgent } from "./agent";
import { BASE_SESSION_CONFIG, VOICE_MODEL } from "./constants";
import { hasUserSpoken, toTranscript, type VoiceTranscriptEntry } from "./transcript";

/** Connection lifecycle phase. */
export type VoicePhase = "idle" | "connecting" | "live" | "error";

/** Why voice is unavailable — drives the specific fallback copy. */
export type VoiceErrorReason =
  | "token"
  | "mic-permission"
  | "mic-missing"
  | "connection"
  | "unsupported";

/** Interaction mode: push-to-talk per turn, or continuous always-listening. */
export type VoiceMode = "tap" | "hands-free";

/** The complete, immutable view of the session the UI renders. */
export interface VoiceSnapshot {
  phase: VoicePhase;
  /** Set only when `phase === "error"`. */
  errorReason: VoiceErrorReason | null;
  /** Mic is open (unmuted) and capturing the learner. */
  listening: boolean;
  /** Koji is currently producing audio. */
  speaking: boolean;
  /** Koji is working on a response (thinking / running a tool). */
  responding: boolean;
  /** The live conversation transcript. */
  transcript: VoiceTranscriptEntry[];
  /** True once the learner has produced transcribed speech (reveal gate). */
  userHasSpoken: boolean;
}

export interface KojiVoiceSessionOptions {
  /** Live tool-context getter passed through to the bound tools. */
  getContext: () => ToolContext;
  /** Current-step grounding for the agent's instructions (answer-free). */
  grounding: Grounding | null;
  /** Initial interaction mode. */
  mode: VoiceMode;
  /** Notified with a fresh snapshot whenever anything changes. */
  onChange: (snapshot: VoiceSnapshot) => void;
  /** Optional voice override. */
  voice?: string;
}

const INITIAL_SNAPSHOT: VoiceSnapshot = {
  phase: "idle",
  errorReason: null,
  listening: false,
  speaking: false,
  responding: false,
  transcript: [],
  userHasSpoken: false,
};

/** Whether this browser can run a WebRTC voice session with mic capture. */
export function isVoiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof RTCPeerConnection !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/** Map a connect rejection to a typed, user-meaningful reason. */
function classifyConnectError(err: unknown): VoiceErrorReason {
  const name =
    err instanceof DOMException || err instanceof Error ? err.name : "";
  if (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    name === "PermissionDeniedError"
  ) {
    return "mic-permission";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "mic-missing";
  }
  return "connection";
}

export class KojiVoiceSession {
  readonly #session: RealtimeSession;
  readonly #onChange: (snapshot: VoiceSnapshot) => void;
  readonly #model: string;
  #mode: VoiceMode;
  #snapshot: VoiceSnapshot = INITIAL_SNAPSHOT;
  #closed = false;

  constructor(options: KojiVoiceSessionOptions) {
    this.#onChange = options.onChange;
    this.#mode = options.mode;
    this.#model = VOICE_MODEL;

    const agent = createKojiRealtimeAgent({
      getContext: options.getContext,
      grounding: options.grounding,
      voice: options.voice,
    });
    this.#session = new RealtimeSession(agent, {
      model: this.#model,
      transport: "webrtc",
      config: BASE_SESSION_CONFIG,
    });

    this.#wireEvents();
  }

  /** The current snapshot (handy for one-off reads). */
  get snapshot(): VoiceSnapshot {
    return this.#snapshot;
  }

  /**
   * Mint a token and connect over WebRTC. Resolves once connected (or once a
   * failure has been recorded as an error phase — it never throws).
   */
  async connect(startListening = true): Promise<void> {
    if (this.#closed) return;
    if (this.#snapshot.phase === "connecting" || this.#snapshot.phase === "live") {
      return;
    }
    if (!isVoiceSupported()) {
      this.#fail("unsupported");
      return;
    }

    this.#patch({ phase: "connecting", errorReason: null });

    let token;
    try {
      token = await mintRealtimeToken();
    } catch {
      this.#fail("token");
      return;
    }
    if (this.#closed) return;
    if (!token.ok || !token.value) {
      this.#fail("token");
      return;
    }

    try {
      await this.#session.connect({
        apiKey: token.value,
        model: token.model ?? this.#model,
      });
    } catch (err) {
      if (!this.#closed) this.#fail(classifyConnectError(err));
      return;
    }

    if (this.#closed) {
      this.#safeClose();
      return;
    }
    this.#patch({ phase: "live", errorReason: null });
    this.#applyListening(startListening);
  }

  /** Switch interaction mode (affects whether the mic auto-closes after a turn). */
  setMode(mode: VoiceMode): void {
    this.#mode = mode;
  }

  /** Open or close the mic. Opening while Koji speaks barges in first. */
  setListening(listening: boolean): void {
    if (this.#snapshot.phase !== "live") return;
    if (listening && this.#snapshot.speaking) this.#interrupt();
    this.#applyListening(listening);
  }

  /** Stop Koji talking (explicit barge-in / "stop" button). */
  interrupt(): void {
    if (this.#snapshot.phase !== "live") return;
    this.#interrupt();
  }

  /** Tear down the session and free the mic. Idempotent. */
  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#safeClose();
    this.#patch({
      phase: "idle",
      listening: false,
      speaking: false,
      responding: false,
    });
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  #wireEvents(): void {
    const session = this.#session;

    // Connection lifecycle comes from the transport (handles unexpected drops).
    session.transport.on("connection_change", (status) => {
      if (this.#closed) return;
      if (status === "connected") {
        this.#patch({ phase: "live" });
      } else if (status === "connecting") {
        this.#patch({ phase: "connecting" });
      } else if (
        status === "disconnected" &&
        (this.#snapshot.phase === "live" || this.#snapshot.phase === "connecting")
      ) {
        this.#fail("connection");
      }
    });

    // Full history on every update → project to the live transcript + first-speech.
    session.on("history_updated", (history) => {
      if (this.#closed) return;
      this.#patch({
        transcript: toTranscript(history),
        userHasSpoken: this.#snapshot.userHasSpoken || hasUserSpoken(history),
      });
    });

    session.on("agent_start", () => {
      if (this.#closed) return;
      // The learner's turn just ended; in tap-to-talk close the mic until they
      // tap to talk again (true push-to-talk). Hands-free keeps listening.
      if (this.#mode === "tap" && this.#snapshot.listening) {
        this.#applyListening(false);
      }
      this.#patch({ responding: true });
    });
    session.on("agent_end", () => {
      if (!this.#closed) this.#patch({ responding: false });
    });
    session.on("audio_start", () => {
      if (!this.#closed) this.#patch({ speaking: true });
    });
    session.on("audio_stopped", () => {
      if (!this.#closed) this.#patch({ speaking: false });
    });
    session.on("audio_interrupted", () => {
      if (!this.#closed) this.#patch({ speaking: false });
    });
    session.on("error", () => {
      if (this.#closed) return;
      this.#fail(this.#snapshot.errorReason ?? "connection");
    });
  }

  #applyListening(listening: boolean): void {
    try {
      this.#session.mute(!listening);
    } catch {
      // The transport may not support muting until fully connected; ignore.
    }
    this.#patch({ listening });
  }

  #interrupt(): void {
    try {
      this.#session.interrupt();
    } catch {
      // No active turn to interrupt; ignore.
    }
    this.#patch({ speaking: false });
  }

  #safeClose(): void {
    try {
      this.#session.close();
    } catch {
      // Already torn down; ignore.
    }
  }

  #fail(reason: VoiceErrorReason): void {
    this.#patch({
      phase: "error",
      errorReason: reason,
      listening: false,
      speaking: false,
      responding: false,
    });
    this.#safeClose();
  }

  #patch(partial: Partial<VoiceSnapshot>): void {
    this.#snapshot = { ...this.#snapshot, ...partial };
    this.#onChange(this.#snapshot);
  }
}
