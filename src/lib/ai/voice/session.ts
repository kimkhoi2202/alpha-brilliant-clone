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
 *  - Run an "open mic + tap to send" loop: once live the mic stays open and the
 *    learner ends a turn explicitly via `commitTurn` (server VAD is off — see
 *    `constants.ts`), which commits the buffered audio and asks Koji to respond.
 *  - Support barge-in (`interrupt`) so the learner can talk over Koji.
 *  - Degrade gracefully: token / mic-permission / connection failures resolve to
 *    a typed error phase instead of throwing (P5).
 *
 * The tools bound to the agent read a *live* `ToolContext` getter, so a single
 * long-lived session always acts on the learner's current step/answer/engagement.
 */
import {
  OpenAIRealtimeWebRTC,
  RealtimeSession,
  type RealtimeItem,
} from "@openai/agents-realtime";

import { mintRealtimeToken } from "../client";
import type { Grounding } from "../grounding";
import type { ToolContext } from "../tools";
import { createKojiRealtimeAgent } from "./agent";
import { BASE_SESSION_CONFIG, VOICE_MODEL } from "./constants";
import { VOICE_ENABLED } from "./flags";
import { hasUserSpoken, toTranscript, type VoiceTranscriptEntry } from "./transcript";

/**
 * Dev-only, greppable realtime logger (prefix `[koji]`). The `import.meta.env.DEV`
 * guard tree-shakes every call out of production bundles, so none of this ships
 * to learners — it exists purely so the next reproduction of the duplicate-reply /
 * silent-death bug shows, in the console, exactly how many sessions and
 * `response.create`s fired and where a duplicate originated.
 */
export function klog(...args: unknown[]): void {
  if (import.meta.env.DEV) console.log("[koji]", ...args);
}

/** First N chars of a turn's text for logs (a snippet, never the whole essay). */
function snippet(text: string, n = 60): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** Connection lifecycle phase. */
export type VoicePhase = "idle" | "connecting" | "live" | "error";

/** Why voice is unavailable — drives the specific fallback copy. */
export type VoiceErrorReason =
  | "token"
  | "mic-permission"
  | "mic-missing"
  | "connection"
  | "unsupported";

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
  /**
   * Monotonic counter bumped on every NON-fatal turn/response error (a failed or
   * cancelled response, a tool/transcription hiccup). The UI watches it to
   * surface a non-spammy toast so a broken turn is never a SILENT stop — the
   * session itself stays alive (only fatal/connection errors set `phase:"error"`).
   */
  turnErrorNonce: number;
}

export interface KojiVoiceSessionOptions {
  /** Live tool-context getter passed through to the bound tools. */
  getContext: () => ToolContext;
  /** Current-step grounding for the agent's instructions (answer-free). */
  grounding: Grounding | null;
  /** Notified with a fresh snapshot whenever anything changes. */
  onChange: (snapshot: VoiceSnapshot) => void;
  /**
   * Prior conversation turns to seed the session with once connected, so Koji
   * has the earlier exchange as context (resume / continue). Built via
   * `toRealtimeHistory`. Seeded turns are excluded from the first-speech signal.
   */
  initialHistory?: RealtimeItem[];
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
  turnErrorNonce: 0,
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

/**
 * Whether a session `error` event is fatal — i.e. the connection/transport (or
 * unrecoverable auth) failed, so the session should be torn down. Routine
 * response / tool / transcription errors are recoverable and must NOT kill a
 * live session. The payload is untyped (`unknown`), so inspect it defensively.
 */
function isFatalSessionError(error: unknown): boolean {
  const text = describeError(error).toLowerCase();
  if (!text) return false;
  return /connection|disconnect|transport|websocket|webrtc|\bice\b|fatal|unauthorized|forbidden|expired|invalid_api_key/.test(
    text,
  );
}

/** Best-effort string of an untyped error (unwraps one level of `.error` nesting). */
function describeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === "object" && error !== null) {
    const rec = error as Record<string, unknown>;
    const inner =
      typeof rec.error === "object" && rec.error !== null
        ? (rec.error as Record<string, unknown>)
        : rec;
    return [inner.type, inner.code, inner.message, inner.name]
      .filter((v): v is string => typeof v === "string")
      .join(" ");
  }
  return "";
}

/**
 * Hard ceiling on a connect attempt. A stalled WebRTC handshake (no answer SDP,
 * ICE never completing, a flaky network) otherwise leaves the UI on "Connecting…"
 * forever; this surfaces it as a clean "couldn't connect — keep going in text".
 */
const CONNECT_TIMEOUT_MS = 20_000;

/**
 * Minimum gap between surfaced non-fatal turn-error toasts. The SDK can emit a
 * flurry of `error` events for one logical failure; this throttles the
 * `turnErrorNonce` bump so the learner sees ONE toast, not a storm.
 */
const TURN_ERROR_THROTTLE_MS = 4_000;

/** Reject `p` if it hasn't settled within `ms` (clears the timer either way). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Realtime connect timed out")),
      ms,
    );
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/** A synthetic, permanently-silent mic stream plus the context backing it. */
interface SilentMic {
  stream: MediaStream;
  /** Kept so the session can close it on teardown. */
  context: AudioContext;
}

/**
 * Build a synthetic, permanently-silent audio `MediaStream` for TEXT-ONLY mode.
 *
 * The SDK's WebRTC transport opens the real microphone itself
 * (`getUserMedia({ audio: true })`) on connect UNLESS it's handed a
 * `mediaStream`. A `MediaStreamAudioDestinationNode` driven by a disabled
 * oscillator yields a live-but-silent audio track, so the peer connection still
 * negotiates the audio sender it expects while we never touch — or prompt for —
 * the (possibly broken) mic. With Koji's output pinned to text there's no audio
 * in either direction. The `AudioContext` is returned so it can be closed on
 * teardown (otherwise it could be GC'd out from under the live track).
 */
function createSilentMic(): SilentMic {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const destination = context.createMediaStreamDestination();
  oscillator.connect(destination);
  oscillator.start();
  const [track] = destination.stream.getAudioTracks();
  // Disable the track so it transmits pure silence (never the oscillator tone).
  if (track) track.enabled = false;
  return { stream: destination.stream, context };
}

export class KojiVoiceSession {
  /** Short, public id so logs can correlate events to a specific session. */
  readonly id: string = `s_${Math.random().toString(36).slice(2, 8)}`;
  readonly #session: RealtimeSession;
  readonly #onChange: (snapshot: VoiceSnapshot) => void;
  readonly #model: string;
  readonly #initialHistory: RealtimeItem[];
  /** Ids of seeded prior turns, so they don't count as new first-speech. */
  readonly #seededIds = new Set<string>();
  /** Backing context for the text-only silent mic track; closed on teardown. */
  #silentAudioContext: AudioContext | null = null;
  #snapshot: VoiceSnapshot = INITIAL_SNAPSHOT;
  #closed = false;
  /** Last non-fatal turn-error timestamp, to throttle the surfaced toast. */
  #lastTurnErrorAt = 0;

  constructor(options: KojiVoiceSessionOptions) {
    this.#onChange = options.onChange;
    this.#model = VOICE_MODEL;
    this.#initialHistory = options.initialHistory ?? [];

    const agent = createKojiRealtimeAgent({
      getContext: options.getContext,
      grounding: options.grounding,
      voice: options.voice,
    });

    // Voice mode: the default WebRTC transport, which opens the mic itself.
    // Text-only mode (VOICE_ENABLED === false): a WebRTC transport seeded with a
    // synthetic silent track so the SDK never calls getUserMedia — typing works
    // without prompting for or depending on the (broken) mic. If AudioContext is
    // somehow unavailable we fall back to the default transport (it would open
    // the mic, but the explicit probe is still skipped — see `connect`).
    let transport: "webrtc" | OpenAIRealtimeWebRTC = "webrtc";
    if (!VOICE_ENABLED && typeof AudioContext !== "undefined") {
      const silent = createSilentMic();
      this.#silentAudioContext = silent.context;
      transport = new OpenAIRealtimeWebRTC({ mediaStream: silent.stream });
    }

    this.#session = new RealtimeSession(agent, {
      model: this.#model,
      transport,
      config: BASE_SESSION_CONFIG,
    });

    klog("session created", {
      session: this.id,
      model: this.#model,
      voiceEnabled: VOICE_ENABLED,
      seedTurns: this.#initialHistory.length,
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
    klog("connect() begin", { session: this.id, startListening, phase: this.#snapshot.phase });
    if (this.#closed) return;
    if (this.#snapshot.phase === "connecting" || this.#snapshot.phase === "live") {
      klog("connect() skipped — already", this.#snapshot.phase, { session: this.id });
      return;
    }
    if (!isVoiceSupported()) {
      this.#fail("unsupported");
      return;
    }

    this.#patch({ phase: "connecting", errorReason: null });

    // Voice mode only: ask for the mic FIRST, synchronously off the click and
    // before any network wait, so the browser's permission dialog is immediate
    // for new users and a denial / missing device is reported cleanly here
    // instead of surfacing late from inside the SDK connect (and as a vague 20s
    // timeout). This only warms the grant: the probe track is stopped right away
    // and the realtime session opens its own mic once permission is in place.
    //
    // Text-only mode (VOICE_ENABLED === false) skips this entirely — Koji needs
    // no mic, so typing must never depend on or prompt for one (the transport
    // uses a synthetic silent track instead; see the constructor).
    if (VOICE_ENABLED) {
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach((track) => track.stop());
      } catch (err) {
        if (!this.#closed) this.#fail(classifyConnectError(err));
        return;
      }
      if (this.#closed) return;
    }

    let token;
    try {
      klog("token mint: requesting", { session: this.id });
      token = await withTimeout(mintRealtimeToken(), CONNECT_TIMEOUT_MS);
    } catch {
      klog("token mint: threw → fail(token)", { session: this.id });
      this.#fail("token");
      return;
    }
    if (this.#closed) return;
    if (!token.ok || !token.value) {
      klog("token mint: not ok → fail(token)", { session: this.id, ok: token.ok });
      this.#fail("token");
      return;
    }
    klog("token mint: ok", { session: this.id, model: token.model ?? this.#model });

    try {
      klog("transport connect: begin", { session: this.id });
      await withTimeout(
        this.#session.connect({
          apiKey: token.value,
          model: token.model ?? this.#model,
        }),
        CONNECT_TIMEOUT_MS,
      );
    } catch (err) {
      klog("transport connect: threw → fail", { session: this.id, err });
      if (!this.#closed) this.#fail(classifyConnectError(err));
      return;
    }

    if (this.#closed) {
      klog("connect() resolved but session was closed mid-connect → safeClose", {
        session: this.id,
      });
      this.#safeClose();
      return;
    }
    this.#patch({ phase: "live", errorReason: null });
    // Seed prior turns BEFORE opening the mic / flushing any queued text, so Koji
    // has the earlier conversation as context from the learner's next word.
    this.#seedHistory();
    this.#applyListening(startListening);
    klog("connect() live", { session: this.id });
  }

  /**
   * Open or close the mic. The open-mic model keeps it open for the whole live
   * session; this is used to open it on entering voice mode (and is available to
   * close it if ever needed). Opening while Koji speaks barges in first.
   */
  setListening(listening: boolean): void {
    if (this.#snapshot.phase !== "live") return;
    if (listening && this.#snapshot.speaking) this.#interrupt();
    this.#applyListening(listening);
  }

  /**
   * Commit the learner's current spoken turn and ask Koji to respond. Server VAD
   * is off (`turn_detection: null`), so the turn boundary is manual: send
   * `input_audio_buffer.commit` (which also kicks off input transcription, so the
   * spoken turn lands in the unified chat + history) then `response.create` to
   * trigger Koji's reply. If Koji is mid-utterance we barge in first so the new
   * turn takes the floor. The mic stays open afterward for the next turn.
   *
   * Both events go through the transport's `sendEvent`; on WebRTC `response.create`
   * is routed through the SDK's response sequencer (it defers until any prior
   * response is fully done), so an immediate commit-after-interrupt is safe.
   */
  commitTurn(): void {
    if (this.#snapshot.phase !== "live") return;
    if (this.#snapshot.speaking || this.#snapshot.responding) this.#interrupt();
    try {
      klog("→ input_audio_buffer.commit + response.create (voice turn)", {
        session: this.id,
      });
      this.#session.transport.sendEvent({ type: "input_audio_buffer.commit" });
      this.#session.transport.sendEvent({ type: "response.create" });
    } catch (err) {
      // Transport not ready / already closing; the learner can tap again.
      klog("commitTurn: transport threw", { session: this.id, err });
    }
  }

  /** Stop Koji talking (explicit barge-in / "stop" button). */
  interrupt(): void {
    if (this.#snapshot.phase !== "live") return;
    this.#interrupt();
  }

  /**
   * Inject a typed user turn into the *live* conversation. The SDK's
   * `sendMessage` adds the message to the session history (so it lands in the
   * same transcript as spoken turns via `history_updated`) and triggers Koji's
   * spoken reply — so talking and typing share one thread. If Koji is mid-
   * utterance we barge in first so the typed question takes the floor. No-ops
   * unless the session is live (the hook connects first, then flushes).
   *
   * An optional client `id` makes the created item carry that exact id, which the
   * Realtime API preserves and echoes back (the same client-id round-trip that
   * `#seedHistory` relies on). The UI renders an OPTIMISTIC user bubble under the
   * same id the instant the learner submits; the echo then dedupes onto it by id
   * (no duplicate, no flicker). Sending the `conversation.item.create` +
   * `response.create` pair directly mirrors what `sendMessage` does internally
   * (on WebRTC `response.create` is routed through the SDK's response sequencer,
   * exactly as in `commitTurn`), just with a chosen id.
   *
   * Returns whether the turn was handed to the live transport. `false` means the
   * send did NOT go through (session not live, or the transport threw) — the
   * caller MUST treat that as a failure (revert the optimistic bubble, restore
   * the typed text) instead of waiting forever for an echo that won't arrive.
   */
  sendText(text: string, id?: string): boolean {
    const trimmed = text.trim();
    if (!trimmed) return false;
    if (this.#snapshot.phase !== "live") {
      klog("sendText: not live → false", {
        session: this.id,
        phase: this.#snapshot.phase,
      });
      return false;
    }
    // Barge-in on speaking OR responding: cancel any in-flight response so this
    // turn gets exactly ONE fresh response (a rapid second send never leaves two
    // responses running concurrently — a source of duplicate replies).
    if (this.#snapshot.speaking || this.#snapshot.responding) this.#interrupt();
    try {
      if (id) {
        klog("→ conversation.item.create", {
          session: this.id,
          id,
          role: "user",
          text: snippet(trimmed),
        });
        this.#session.transport.sendEvent({
          type: "conversation.item.create",
          item: {
            id,
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: trimmed }],
          },
        });
        klog("→ response.create (typed turn)", { session: this.id, id });
        this.#session.transport.sendEvent({ type: "response.create" });
      } else {
        klog("→ sendMessage (no id; SDK creates item + response.create)", {
          session: this.id,
          text: snippet(trimmed),
        });
        this.#session.sendMessage(trimmed);
      }
      return true;
    } catch (err) {
      // Transport not ready / already closing: report the failure so the caller
      // can revert the optimistic turn + restore the text (no silent no-op).
      klog("sendText: transport threw → false", { session: this.id, err });
      return false;
    }
  }

  /**
   * Inject a one-off DEVELOPER/SYSTEM instruction into the *live* conversation
   * and ask Koji to respond to it with exactly one turn — the mechanism behind
   * PROACTIVE coaching (e.g. "the learner just answered wrong; give one Socratic
   * nudge"). Unlike `sendText` this adds a `system`-role item, which
   * `toTranscript` filters out (it surfaces only user/assistant turns), so there
   * is NO fake visible user bubble — only Koji's resulting reply shows, reading
   * as Koji noticing the miss and stepping in on his own. It is likewise excluded
   * from `hasUserSpoken`, so a proactive nudge never falsely unlocks the reveal
   * effort-gate.
   *
   * Exactly ONE `response.create` is sent, routed (on WebRTC) through the SDK's
   * response sequencer — which defers it until any in-flight response is fully
   * done and never runs two responses concurrently. That is the same
   * one-response-per-turn guarantee `sendText` / `commitTurn` rely on, so this
   * can't duplicate a reply. The caller (the hook) decides whether to skip when a
   * response is already in flight; this method just performs the send. No-ops
   * unless the session is live.
   *
   * Returns whether the turn was handed to the live transport.
   */
  sendDeveloperTurn(instruction: string): boolean {
    const text = instruction.trim();
    if (!text) return false;
    if (this.#snapshot.phase !== "live") {
      klog("sendDeveloperTurn: not live → false", {
        session: this.id,
        phase: this.#snapshot.phase,
      });
      return false;
    }
    try {
      // System-role item: instructions for Koji, NOT a learner turn. It's dropped
      // from the visible transcript + the first-speech signal, so no user bubble
      // appears and reveal stays gated. (No client id needed — nothing dedupes
      // against it on screen.)
      klog("→ conversation.item.create (developer/system nudge)", {
        session: this.id,
        text: snippet(text),
      });
      this.#session.transport.sendEvent({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text }],
        },
      });
      // Exactly one response.create — routed through the response sequencer on
      // WebRTC (defers until any prior response is done), so it can never run a
      // second concurrent response. This is the dup-fix's one-response-per-turn
      // path, identical to sendText / commitTurn.
      klog("→ response.create (proactive developer turn)", { session: this.id });
      this.#session.transport.sendEvent({ type: "response.create" });
      return true;
    } catch (err) {
      // Transport not ready / already closing.
      klog("sendDeveloperTurn: transport threw → false", {
        session: this.id,
        err,
      });
      return false;
    }
  }

  /** Tear down the session and free the mic. Idempotent. */
  close(): void {
    if (this.#closed) return;
    klog("close()", { session: this.id, phase: this.#snapshot.phase });
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
      klog("connection_change", {
        session: this.id,
        status,
        phase: this.#snapshot.phase,
      });
      if (status === "connected") {
        this.#patch({ phase: "live" });
      } else if (status === "connecting") {
        this.#patch({ phase: "connecting" });
      } else if (
        status === "disconnected" &&
        (this.#snapshot.phase === "live" || this.#snapshot.phase === "connecting")
      ) {
        klog("connection dropped → fail(connection)", { session: this.id });
        this.#fail("connection");
      }
    });

    // Raw server events — log only the turn-shaping ones (response lifecycle +
    // errors), so a reproduction shows how many responses the SERVER actually
    // started for one user turn (the duplicate-reply fingerprint) without the
    // audio-delta firehose.
    session.on("transport_event", (event) => {
      if (this.#closed) return;
      const type = typeof event.type === "string" ? event.type : "";
      if (
        type === "response.created" ||
        type === "response.done" ||
        type === "response.cancelled" ||
        type === "response.failed" ||
        type === "error" ||
        type.endsWith(".error") ||
        type.endsWith(".failed")
      ) {
        klog(`⇐ ${type}`, { session: this.id, event });
      }
    });

    // Full history on every update → project to the live transcript + first-speech.
    // Seeded prior turns are excluded from first-speech so a resumed conversation
    // doesn't auto-unlock the reveal effort-gate on a fresh step.
    session.on("history_updated", (history) => {
      if (this.#closed) return;
      const transcript = toTranscript(history);
      klog("history_updated", {
        session: this.id,
        len: transcript.length,
        turns: transcript.map(
          (e) => `${e.role[0]}:${e.id.slice(-6)}${e.inProgress ? "*" : ""}`,
        ),
      });
      this.#patch({
        transcript,
        userHasSpoken:
          this.#snapshot.userHasSpoken || hasUserSpoken(history, this.#seededIds),
      });
    });

    session.on("agent_start", () => {
      if (this.#closed) return;
      // Open-mic model: the mic stays open across turns (it's the SEND button,
      // not the end of the learner's audio, that drives turn-taking), so we do
      // NOT close it here — just reflect that Koji is now responding.
      klog("agent_start (responding)", { session: this.id });
      this.#patch({ responding: true });
    });
    session.on("agent_end", () => {
      if (this.#closed) return;
      klog("agent_end (done)", { session: this.id });
      this.#patch({ responding: false });
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
    session.on("error", (event) => {
      if (this.#closed) return;
      const fatal = isFatalSessionError(event.error);
      klog(fatal ? "session error: FATAL → fail" : "session error: non-fatal", {
        session: this.id,
        detail: describeError(event.error),
        error: event.error,
      });
      // Connection loss arrives separately via `connection_change`; a genuinely
      // fatal/auth error tears the session down here.
      if (fatal) {
        this.#fail(this.#snapshot.errorReason ?? "connection");
        return;
      }
      // NON-fatal (a failed/cancelled response, a tool or transcription hiccup):
      // do NOT swallow it — that was the SILENT DEATH (Koji just stops). Keep the
      // live session (so the next send works) but clear the "responding" cue so
      // the learner isn't left hanging, and bump `turnErrorNonce` (throttled) so
      // the UI surfaces a visible, non-spammy toast.
      this.#patch({ responding: false, speaking: false });
      const now = Date.now();
      if (now - this.#lastTurnErrorAt > TURN_ERROR_THROTTLE_MS) {
        this.#lastTurnErrorAt = now;
        this.#patch({ turnErrorNonce: this.#snapshot.turnErrorNonce + 1 });
      }
    });
  }

  /**
   * Seed the freshly-connected session with prior conversation turns. `connect`
   * resets history to empty and emits `history_updated`, so this runs right after
   * going live: `updateHistory` diffs `[] → initialHistory` and the transport
   * sends a `conversation.item.create` per turn (no response is triggered — it's
   * pure context). The created items echo back with their client-provided ids, so
   * the on-screen merge dedupes them against the restored transcript.
   */
  #seedHistory(): void {
    if (this.#initialHistory.length === 0) return;
    try {
      klog("seedHistory", { session: this.id, count: this.#initialHistory.length });
      this.#session.updateHistory(this.#initialHistory);
      for (const item of this.#initialHistory) this.#seededIds.add(item.itemId);
    } catch (err) {
      // Seeding is best-effort context; a failure just means Koji starts without
      // the prior turns (the on-screen transcript still shows them).
      klog("seedHistory: threw (best-effort, ignored)", { session: this.id, err });
    }
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
    // Release the text-only silent mic's AudioContext (idempotent).
    if (this.#silentAudioContext) {
      const context = this.#silentAudioContext;
      this.#silentAudioContext = null;
      void context.close().catch(() => {
        // Already closed / unsupported; nothing to clean up.
      });
    }
  }

  #fail(reason: VoiceErrorReason): void {
    klog("#fail → error", { session: this.id, reason, from: this.#snapshot.phase });
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
    if (partial.phase !== undefined && partial.phase !== this.#snapshot.phase) {
      klog("phase", {
        session: this.id,
        from: this.#snapshot.phase,
        to: partial.phase,
      });
    }
    this.#snapshot = { ...this.#snapshot, ...partial };
    this.#onChange(this.#snapshot);
  }
}
