/**
 * VoiceControls (PRD-phase-2 §4.1): the in-panel surface for talking *and* typing
 * to Koji — one unified thread with a single ChatGPT-style composer.
 *
 * Layout (top → bottom):
 *  - **Chat thread:** the realtime session transcript — the learner's spoken
 *    (auto-transcribed) turns, their typed turns, and Koji's replies, in order,
 *    auto-scrolled to the latest.
 *  - **Composer:** one row that has two modes.
 *      · **Text mode:** a text field + one round button that morphs (a subtle
 *        cross-fade + slight scale, ~150ms, instant under reduced motion) between
 *        **mic** (empty field → tap to enter voice mode) and **send** (typed text
 *        → send it into the *same* realtime session; Koji replies by voice and the
 *        typed turn lands in the thread). Focus alone never flips mic→send; only
 *        actual typed characters do.
 *      · **Voice mode (open mic + tap to send):** the field becomes a live
 *        waveform and the right side follows the connection. While *connecting*
 *        it's a single yellow circle with a spinner; once *live* that circle
 *        morphs into the blue **send** button and a red **stop** button animates
 *        in beside it. The mic stays open continuously (always listening);
 *        tapping send commits the learner's current spoken turn and asks Koji to
 *        reply, then the mic keeps listening for the next turn. Stop ends the
 *        session and returns to the text field.
 *
 * AI-off / unsupported: renders nothing (voice and the text chat both ride the
 * realtime session). Connection failures surface as a bottom-left HeroUI toast —
 * there is no inline error UI here.
 *
 * All chat/voice state lives in `useKoji` (the backend selector — the realtime
 * `gpt-realtime-2` session by default, or the flag-gated `gpt-5.5` Responses chat;
 * both expose the same `RealtimeVoiceApi`); this component is presentational plus
 * the engagement wiring (first speech / first typed turn → `markTalkedToKoji`).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "@heroui/react";

import type { ConversationMessage } from "../../../lib/ai/conversation-history";
import type { ToolContext } from "../../../lib/ai/tools";
import { useKoji } from "../../../lib/ai/chat";
import {
  collapseConsecutiveAssistant,
  toRealtimeHistory,
  VOICE_ENABLED,
  type RealtimeVoiceApi,
  type VoiceErrorReason,
  type VoiceTranscriptEntry,
} from "../../../lib/ai/voice";
// Shared dev-only `[koji]` logger (lives in the session module; the barrel
// doesn't re-export it, so import it directly — DEV-gated, stripped from prod).
import { klog } from "../../../lib/ai/voice/session";
import { cn } from "../../../lib/cn";
import { KojiWaveform } from "./koji-waveform";
import { useChatScroll, type ChatScrollItem } from "./use-chat-scroll";

/** Shared easing token (Emil Kowalski blueprint), inlined for Motion. */
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

/**
 * Spring for the connecting→live morph (color + the stop button's entrance).
 * Soft and physical but restrained — this is a focused study app, not a toy
 * (low bounce, ~0.4s visual duration), per the Motion design guidance.
 */
const MORPH_SPRING = { type: "spring", bounce: 0.2, visualDuration: 0.4 } as const;

/** Mic peak (gained, 0–1) above which we treat the learner as having spoken. */
const SPEECH_LEVEL_THRESHOLD = 0.2;
/**
 * Fallback that arms the send button shortly after going live even if no speech
 * was detected — so reduced-motion users (whose waveform doesn't tap the mic)
 * and the rare meter failure are never locked out of sending.
 */
const SEND_ARM_FALLBACK_MS = 1500;

/**
 * A fresh, collision-safe id for an OPTIMISTIC typed turn. It becomes the turn's
 * permanent id: it's passed to `session.sendText`, the Realtime API preserves
 * and echoes it on the created user item, and persistence stores it — so the
 * optimistic bubble, the live echo, and the restored turn all share one id and
 * dedupe cleanly. Shaped like the API's own item ids (`item_` + alphanumerics,
 * no dashes) so it round-trips through `conversation.item.create` exactly as the
 * server-issued ids that seeding/restore already rely on do.
 */
function newClientTurnId(): string {
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

/**
 * A one-shot signal to restore a reverted turn's text back into the composer
 * (which cleared its draft on submit). The `nonce` makes every revert a fresh
 * object so the composer's restore effect re-fires even when the restored text
 * is identical to the previous revert.
 */
interface RevertSignal {
  text: string;
  nonce: number;
}

/**
 * Grace period before the dedupe FALLBACK prunes an optimistic turn whose echo
 * never matched by id (and no reply has begun streaming). Long enough that a
 * normal, fast by-id echo always wins the race (so the happy path never flashes),
 * short enough that a non-preserved id self-heals from a permanent duplicate into
 * a brief one. See the fallback effect in `VoiceControls`.
 */
const DEDUPE_FALLBACK_MS = 4000;

/** Resolved morph endpoints: connecting (yellow) ⇄ live (blue), bg + icon color. */
interface MorphColors {
  connectBg: string;
  connectFg: string;
  liveBg: string;
  liveFg: string;
}

let morphColorsCache: MorphColors | null = null;

/**
 * Resolve a theme color token (e.g. `--accent`) to a concrete value Motion can
 * interpolate — it can't tween `var(--token)` strings. We read the LIVE token off
 * a throwaway element so the morph tracks the palette; the documented hex is just
 * a fallback. Cached after the first read.
 */
function readThemeColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const probe = document.createElement("span");
  probe.style.color = `var(${varName})`;
  probe.style.position = "absolute";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  return resolved || fallback;
}

function getMorphColors(): MorphColors {
  if (morphColorsCache) return morphColorsCache;
  morphColorsCache = {
    connectBg: readThemeColor("--warning", "#f9d25c"),
    connectFg: readThemeColor("--warning-foreground", "#141414"),
    liveBg: readThemeColor("--accent", "#456dff"),
    liveFg: readThemeColor("--accent-foreground", "#ffffff"),
  };
  return morphColorsCache;
}

export interface VoiceControlsProps {
  /** Live tool context (learner + step + grounding + engagement). */
  ctx: ToolContext;
  /**
   * Prior turns of THIS conversation — rendered immediately and used to seed the
   * realtime session so Koji resumes with context. Fixed for the mount (the panel
   * keys this surface by conversation identity).
   */
  initialMessages: ConversationMessage[];
  /**
   * Free-form (lesson-level) grounding for a resumed PAST conversation; the
   * current lesson's live conversation passes false (stays grounded to the step).
   */
  freeform: boolean;
  /**
   * Proactive-coaching trigger: flips true on a fresh wrong-answer auto-offer
   * (the host's ≥2-wrong, once-per-step latch). When it's true this surface fires
   * EXACTLY ONE proactive Koji coach turn into the realtime session, then calls
   * {@link onCoachHandled} so the host clears it. Latched + cleared this way so a
   * remount (new chat / resume) can never replay a stale offer.
   */
  coachPending: boolean;
  /** Clear the proactive-coach flag once this surface has fired the turn (once per offer). */
  onCoachHandled: () => void;
  /** Lift settled turns (restored + new) up to the lesson store for persistence. */
  onPersist: (messages: ConversationMessage[]) => void;
  /**
   * Jump back to a specific already-reached step — wired to the clickable
   * "answer" bubbles so tapping a recorded try returns the learner to that exact
   * step (with its saved answer + verdict restored). Optional; absent → bubbles
   * render but aren't navigable.
   */
  onGoToStep?: (stepIndex: number) => void;
  /**
   * Report whether the thread currently has any visible content (≥1 turn with
   * text — the same predicate `ChatThread` uses). The panel lifts this signal to
   * lay Koji out: centered while empty, compact at the top once there's a chat.
   * Fired from an effect (never during render) only when the boolean flips.
   */
  onContentPresent?: (present: boolean) => void;
}

interface ErrorCopy {
  title: string;
  hint: string;
}

/** Map a typed voice error to user-meaningful toast copy. */
function errorCopy(reason: VoiceErrorReason | null): ErrorCopy {
  switch (reason) {
    case "mic-permission":
      return {
        title: "Microphone blocked",
        hint: "Allow mic access and try again.",
      };
    case "mic-missing":
      return {
        title: "No microphone found",
        hint: "We couldn't find a mic — keep going in text.",
      };
    case "unsupported":
      return {
        title: "Voice unavailable",
        hint: "This device can't run voice — keep going in text.",
      };
    default:
      return {
        title: "Voice unavailable",
        hint: "Couldn't connect — keep going in text.",
      };
  }
}

export function VoiceControls({
  ctx,
  initialMessages,
  freeform,
  coachPending,
  onCoachHandled,
  onPersist,
  onContentPresent,
  onGoToStep,
}: VoiceControlsProps) {
  const engagement = ctx.engagement;

  // `initialMessages` is fixed for the conversation (the panel re-keys this
  // surface per conversation identity); it serves as both the display base and
  // the session seed. Seeded turns keep their ids, so live echoes dedupe by id.
  const voice = useKoji({
    getContext: () => ctx,
    // Talking with Koji counts as engagement (unlocks the reveal "talked" path).
    onUserSpoke: () => engagement.markTalkedToKoji(),
    // Seed the fresh session with this conversation's prior turns as context
    // (evaluated at connect time, so it captures the latest restored snapshot).
    // Special "answer" bubbles are history-only records, not realtime turns, so
    // they're excluded from the seed — Koji reads the live answer via readState.
    getInitialHistory: () =>
      toRealtimeHistory(initialMessages.filter((m) => m.kind !== "answer")),
    // Resumed past conversations are free-form (lesson-level), not pinned to the
    // current step's problem.
    getGrounding: freeform ? () => null : undefined,
  });

  // Latest voice api + coach-handled callback, read via refs so the proactive
  // trigger effect can depend ONLY on `coachPending` — an unrelated voice-state
  // change (or a churning callback identity) never re-fires it.
  const voiceRef = useRef(voice);
  const onCoachHandledRef = useRef(onCoachHandled);
  useEffect(() => {
    voiceRef.current = voice;
    onCoachHandledRef.current = onCoachHandled;
  });

  // Optimistic typed turns: rendered the instant the learner submits, before the
  // realtime round-trip. Each carries a client id passed to `sendText`; the API
  // echoes that id back, so the live turn dedupes onto the optimistic one by id
  // (see `entries`). Pruned once the echo lands (the effect below).
  const [optimistic, setOptimistic] = useState<VoiceTranscriptEntry[]>([]);
  // True from a typed send OR a proactive coach turn until Koji's reply starts
  // streaming — drives the subtle "Koji is thinking…" cue. Scoped to an actual
  // send / coach turn so pre-warm connecting (or a restored thread that ends on a
  // user turn) never shows a phantom indicator.
  const [awaitingKoji, setAwaitingKoji] = useState(false);
  // One-shot "restore this text into the composer" signal, lifted down to the
  // ChatComposer when an optimistic turn is reverted after a failure (the
  // composer already cleared its draft on submit). Null until the first revert.
  const [revertSignal, setRevertSignal] = useState<RevertSignal | null>(null);

  // Proactive coaching: when the host signals a fresh wrong-answer offer
  // (`coachPending`), fire EXACTLY ONE developer-driven coach turn into this
  // realtime session, then immediately ask the host to clear the flag. Firing +
  // clearing means: (1) it runs once per offer (the next render sees
  // coachPending=false → no-op), and (2) a later remount of this surface (new
  // chat / resume) can't replay a stale offer, since the host already cleared it.
  // The send itself is dup-safe (single-flight connect + one response-per-turn
  // inside the hook), and `coachProactively` skips outright if a reply is already
  // in flight, so it can't race the learner's own send.
  //
  // NOTE: no extra idempotency guard here. Under dev StrictMode the connect that
  // `coachProactively()` starts is torn down by the simulated-unmount cleanup, and
  // it's the post-cleanup re-setup that actually connects and fires — so guarding
  // the second invoke would leave the coach with a torn-down session and no reply
  // in dev. The behavior is already correct: `onCoachHandled` clears `coachPending`
  // so a normal re-render no-ops, the hook's single-flight connect collapses any
  // overlap to one live session, and one response fires per turn. (Prod has no
  // double-invoke, so it simply connects once and fires.)
  useEffect(() => {
    if (!coachPending) return;
    klog("proactive coach: offer seen → coachProactively()");
    voiceRef.current.coachProactively();
    onCoachHandledRef.current();
    // Raise the "Koji is thinking…" cue for the WHOLE proactive turn — the
    // connect → readState/highlight tool-call → first-token window — so the panel
    // never reads as an empty/broken tutor before Koji's first reply lands. Only
    // when a backend will actually reply (mirrors coachProactively's own
    // AI-off/unsupported no-op), so the defensive AI-off path keeps reporting "no
    // content" and Koji stays centered. The write is deferred to a rAF per the
    // file convention (never setState synchronously in an effect body). It is
    // intentionally NOT cancelled in a cleanup: the rAF only flips `awaitingKoji`
    // true — an idempotent, bounded write — so a cleanup tied to the `coachPending`
    // flip (which onCoachHandled() clears synchronously, re-running this effect)
    // would be pure churn. The cue is bounded regardless — it clears on Koji's
    // first tokens (the `thinking` derivation + the reply-visible latch effect), on
    // error (phase / turnError), or via the 30s `awaitingKoji` timeout — and a late
    // rAF after unmount is a harmless no-op in React.
    if (voiceRef.current.aiEnabled && voiceRef.current.supported) {
      requestAnimationFrame(() => setAwaitingKoji(true));
    }
  }, [coachPending]);

  const sendUserText = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const id = newClientTurnId();
      const status = voice.sendText(trimmed, id);
      if (status === "failed") {
        // Rejected outright with NO error phase to follow (the silent-failure
        // path): nothing was added optimistically, so just toast here and let
        // the composer restore the typed text via this `false` return. The
        // connect/token-failure path stays out of here — it reaches phase
        // "error" and is reverted (and already toasted) by the effect below.
        toast.danger("Couldn't send", {
          description: "Something went wrong — please try again.",
          timeout: 6000,
        });
        return false;
      }
      // "sent" or "queued": show the optimistic bubble + the thinking cue. A
      // live send dedupes onto its echo by id (happy path); a queued turn whose
      // connect later fails is reverted by the phase-error effect below.
      klog("optimistic add", {
        id,
        status,
        text: trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed,
      });
      setOptimistic((prev) => [
        ...prev,
        { id, role: "user", text: trimmed, inProgress: false },
      ]);
      setAwaitingKoji(true);
      return true;
    },
    [voice],
  );

  // Pre-warm: connect when the surface opens so the first send isn't blocked on
  // the WebRTC handshake. Text-only connect never probes/prompts for the mic, so
  // it's cheap and silent. Guarded to fire once, only while AI is on, and only in
  // text-only mode (voice mode connects on the mic tap, prompting only then).
  const prewarmedRef = useRef(false);
  useEffect(() => {
    if (prewarmedRef.current || VOICE_ENABLED) return;
    if (!voice.aiEnabled || !voice.supported) return;
    prewarmedRef.current = true;
    voice.prewarm();
  }, [voice]);

  // Connection failures become a bottom-left toast (no inline error UI). Fire
  // once per entry into an error reason; reset when the session leaves error so a
  // failed retry re-toasts.
  const toastedRef = useRef<VoiceErrorReason | null>(null);
  useEffect(() => {
    if (voice.phase !== "error" || !voice.errorReason) {
      toastedRef.current = null;
      return;
    }
    if (toastedRef.current === voice.errorReason) return;
    toastedRef.current = voice.errorReason;
    const { title, hint } = errorCopy(voice.errorReason);
    // Keep the error readable well past HeroUI's 4s default — it's actionable
    // ("allow mic / keep going in text") and easy to miss mid-fumble.
    toast.danger(title, { description: hint, timeout: 8000 });
  }, [voice.phase, voice.errorReason]);

  // Non-fatal turn errors (Koji's reply failed but the session is STILL alive —
  // the silent-death case). Surfaced as a visible toast so the learner never just
  // sees Koji go quiet. The session throttles `turnErrorNonce`, so this is
  // already non-spammy; we only toast on a real bump and clear the thinking cue.
  const lastTurnErrorRef = useRef(0);
  useEffect(() => {
    if (voice.turnErrorNonce <= lastTurnErrorRef.current) return;
    lastTurnErrorRef.current = voice.turnErrorNonce;
    klog("turn error surfaced (toast)", { nonce: voice.turnErrorNonce });
    toast.danger("Koji hit a problem", {
      description: "That reply didn't go through — try again.",
      timeout: 6000,
    });
    // Stop the "thinking…" cue (deferred — never setState synchronously in an
    // effect body, per the codebase convention).
    const raf = requestAnimationFrame(() => setAwaitingKoji(false));
    return () => cancelAnimationFrame(raf);
  }, [voice.turnErrorNonce]);

  // The displayed thread = restored prior turns (shown immediately) merged with
  // the live session transcript, then any not-yet-echoed optimistic turns —
  // deduped by id throughout. Seeded turns echo back with their original ids, so
  // they collapse onto the restored entries; an optimistic turn collapses onto
  // its echo the moment the same-id live turn appears (no duplicate, no flicker).
  //
  // A final `collapseConsecutiveAssistant` pass folds any run of back-to-back,
  // byte-identical assistant turns into ONE bubble. That's the guarantee for the
  // model/SDK duplicate-final-answer case: when one turn emits the same reply as
  // TWO assistant items with DIFFERENT ids, the id-dedupe above can't catch them
  // (different ids), so this text-based collapse ensures exactly one rendered
  // reply. It only touches identical consecutive ASSISTANT turns, so the
  // optimistic-user dedupe-by-id stays intact and no distinct turn is ever hidden.
  const entries = useMemo<VoiceTranscriptEntry[]>(() => {
    const seen = new Set<string>();
    const merged: VoiceTranscriptEntry[] = [];
    for (const m of initialMessages) {
      if (!m.text.trim() || seen.has(m.id)) continue;
      seen.add(m.id);
      // Carry the special "answer" bubble metadata through to the rendered entry
      // (kind/correct/stepIndex + the persisted ts) so the distinct yellow ✓/✗
      // bubble, its click-to-step navigation, and stable persistence all survive
      // the round-trip. Ordinary turns leave these undefined.
      merged.push(
        m.kind === "answer"
          ? {
              id: m.id,
              role: m.role,
              text: m.text,
              inProgress: false,
              kind: "answer",
              correct: m.correct,
              stepIndex: m.stepIndex,
              ts: m.ts,
            }
          : { id: m.id, role: m.role, text: m.text, inProgress: false },
      );
    }
    for (const e of voice.transcript) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      merged.push(e);
    }
    for (const o of optimistic) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      merged.push(o);
    }
    return collapseConsecutiveAssistant(merged);
  }, [initialMessages, voice.transcript, optimistic]);

  // Prune optimistic turns once their echo lands in the transcript (same id), so
  // the array stays small. (The merge already hides echoed entries by id, so this
  // is pure housekeeping — never a visible change.) The state update runs in a
  // deferred rAF, never synchronously in the effect body, and is idempotent.
  useEffect(() => {
    if (optimistic.length === 0) return;
    const live = new Set(voice.transcript.map((e) => e.id));
    const matched = optimistic.filter((o) => live.has(o.id)).map((o) => o.id);
    if (matched.length === 0) return;
    klog("dedupe: prune matched-by-id", { ids: matched });
    const raf = requestAnimationFrame(() => {
      setOptimistic((prev) => prev.filter((o) => !live.has(o.id)));
    });
    return () => cancelAnimationFrame(raf);
  }, [voice.transcript, optimistic]);

  // Optimistic ERROR-REVERT (FIX 1): if the session drops into an error while
  // typed turns are still optimistic (their echo never arrived — the send or the
  // connect failed), undo them. Turns whose echo DID land (id in the live
  // transcript) were delivered, so we leave those alone. For the stranded ones we
  // (a) pull the bubbles, (b) stop the thinking cue, and (c) hand the text back
  // to the composer so it isn't lost. We do NOT toast here: reaching phase
  // "error" always means the connect/token-failure toast effect above fired, so a
  // second toast would double up. The writes run in a deferred rAF (never
  // synchronously in the effect body) and converge — once the stranded turns are
  // gone the next pass is a no-op.
  useEffect(() => {
    if (voice.phase !== "error" || optimistic.length === 0) return;
    const live = new Set(voice.transcript.map((e) => e.id));
    const stranded = optimistic.filter((o) => !live.has(o.id));
    if (stranded.length === 0) return;
    const ids = new Set(stranded.map((o) => o.id));
    const text = stranded.map((o) => o.text).join("\n");
    klog("dedupe: ERROR-REVERT stranded optimistic", {
      ids: [...ids],
      reason: voice.errorReason,
    });
    const raf = requestAnimationFrame(() => {
      setOptimistic((prev) => prev.filter((o) => !ids.has(o.id)));
      setAwaitingKoji(false);
      setRevertSignal((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }));
    });
    return () => cancelAnimationFrame(raf);
  }, [voice.phase, voice.errorReason, voice.transcript, optimistic]);

  // Dedupe FALLBACK (FIX 2): the happy-path prune above matches an echo to its
  // optimistic turn purely by id. If the Realtime API ever fails to preserve our
  // client id on `conversation.item.create`, the echo lands under a DIFFERENT id,
  // the by-id match never happens, and the optimistic bubble would sit forever as
  // a permanent duplicate of the (now visible) echo. So once a live reply is
  // actually streaming — an in-progress assistant turn, which rides the very same
  // `history_updated` snapshot the user echo would be in, so this can't race
  // ahead of a preserved-id echo — OR a short grace period elapses, drop any
  // still-un-echoed optimistic turns. With a preserved id this is a no-op (they
  // were already pruned); with a non-preserved id it degrades the duplicate to a
  // brief flash. Gated on `live` so queued turns (flushed on connect) and error
  // turns (reverted above) are left alone.
  useEffect(() => {
    if (voice.phase !== "live" || optimistic.length === 0) return;
    const live = new Set(voice.transcript.map((e) => e.id));
    const unEchoed = optimistic.filter((o) => !live.has(o.id));
    if (unEchoed.length === 0) return;
    const ids = new Set(unEchoed.map((o) => o.id));
    const prune = (via: string) => {
      klog("dedupe: FALLBACK prune un-echoed optimistic", { ids: [...ids], via });
      setOptimistic((prev) => prev.filter((o) => !ids.has(o.id)));
    };
    const replyStreaming = voice.transcript.some(
      (e) => e.role === "assistant" && e.inProgress,
    );
    if (replyStreaming) {
      const raf = requestAnimationFrame(() => prune("reply-streaming"));
      return () => cancelAnimationFrame(raf);
    }
    const timer = window.setTimeout(() => prune("timeout"), DEDUPE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [voice.phase, voice.transcript, optimistic]);

  usePersistedConversation(entries, initialMessages, onPersist);

  // The role of the last turn that has visible text. Koji's reply "begins
  // streaming" exactly when this flips to "assistant" (an in-progress assistant
  // item with no text yet is filtered out, so the thinking cue holds until real
  // tokens arrive).
  const lastVisibleRole = useMemo<"user" | "assistant" | null>(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].text.length > 0) return entries[i].role;
    }
    return null;
  }, [entries]);
  // Show the cue while we're awaiting a reply AND the last visible turn is NOT yet
  // Koji's — so it holds for a typed turn (its optimistic user bubble is the last
  // turn) AND for a proactive coach turn on an EMPTY thread, where there's no user
  // bubble at all (`lastVisibleRole` is null). Koji's first reply tokens flip
  // `lastVisibleRole` to "assistant" and hide it; an error state hides it too. The
  // cue's visibility is derived, but the underlying `awaitingKoji` latch is also
  // cleared by an effect below the instant the reply is visible, so the latch can't
  // outlive the turn and re-show the cue if a later non-assistant turn lands.
  //
  // Gap (intentional): a coach turn on a thread already ending in an assistant turn
  // shows no dots until its reply lands — acceptable, the panel isn't blank (prior
  // content keeps it docked); only the empty-thread case was broken.
  const thinking =
    awaitingKoji && lastVisibleRole !== "assistant" && voice.phase !== "error";

  // Drop the latch the moment Koji's reply is visible, so it can't outlive the
  // turn and re-show the cue if a later non-assistant turn (a recorded answer or
  // a spoken turn) lands inside the 30s window. Deferred per the file convention.
  useEffect(() => {
    if (!awaitingKoji || lastVisibleRole !== "assistant") return;
    const raf = requestAnimationFrame(() => setAwaitingKoji(false));
    return () => cancelAnimationFrame(raf);
  }, [awaitingKoji, lastVisibleRole]);

  // Safety net: never let the awaiting flag hang forever if a reply never
  // materializes (e.g. a silent stall). The state change runs in the deferred
  // timer callback, never in the effect body.
  useEffect(() => {
    if (!awaitingKoji) return;
    const timer = window.setTimeout(() => setAwaitingKoji(false), 30_000);
    return () => window.clearTimeout(timer);
  }, [awaitingKoji]);

  // Whether the thread shows anything — mirrors `ChatThread`'s `visible` filter
  // (a turn counts once it has text). Reported up to the panel so it can center
  // Koji while empty and dock him to the top once a chat exists. Runs as an
  // effect, only firing when the boolean flips (per the codebase convention of
  // never calling setState during render). This stays above the early returns so
  // an unsupported/AI-off mount still reports "no content" → Koji stays centered.
  const hasContent = useMemo(
    () => entries.some((e) => e.text.length > 0),
    [entries],
  );
  // Count an active "thinking" cue as content too, so the panel docks Koji and
  // grows the thread region to make room for the cue — while empty the thread's
  // flexGrow is 0, leaving a coach-on-empty cue nowhere to render. When the cue
  // clears with still no content (e.g. a proactive coach turn that errors out
  // before any reply) this falls back to false and Koji returns to centered.
  // `thinking` is already gated so it can't be true with AI off, so the AI-off
  // "stays centered" note above still holds.
  const contentPresent = hasContent || thinking;
  useEffect(() => {
    onContentPresent?.(contentPresent);
  }, [contentPresent, onContentPresent]);

  // AI-off (defensive — the panel is already gated): render nothing.
  if (!voice.aiEnabled) return null;
  // No WebRTC: both voice and the unified text chat ride the realtime session,
  // so there's nothing to show here. The hint cards below still work.
  if (!voice.supported) return null;

  return (
    <section
      aria-label="Talk or type to Koji"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ChatThread entries={entries} thinking={thinking} onGoToStep={onGoToStep} />

      <ChatComposer
        voice={voice}
        onSendText={sendUserText}
        revert={revertSignal}
      />
    </section>
  );
}

/**
 * Lift settled turns (restored + new, deduped) up to the lesson store so the
 * conversation persists as it grows and survives the panel closing. All of the
 * work runs in an effect (never during render): streaming (in-progress) turns are
 * excluded, each turn gets a stable timestamp (restored keep theirs; new ones are
 * stamped once when they first settle), and a signature compare avoids re-saving
 * unchanged data — so the restored snapshot isn't redundantly re-written.
 */
function usePersistedConversation(
  entries: VoiceTranscriptEntry[],
  initial: ConversationMessage[],
  onPersist: (messages: ConversationMessage[]) => void,
) {
  const tsMapRef = useRef<Map<string, number> | null>(null);
  const lastSigRef = useRef<string | null>(null);
  const initialRef = useRef(initial);
  const onPersistRef = useRef(onPersist);
  // Keep the latest callback without re-running the persist effect (codebase
  // convention: refs are updated in an effect, never during render).
  useEffect(() => {
    onPersistRef.current = onPersist;
  });

  useEffect(() => {
    // One-time init from the restored snapshot: stamp known ids + seed the
    // "already persisted" signature so the first pass doesn't re-save it.
    let map = tsMapRef.current;
    if (map === null) {
      map = new Map(initialRef.current.map((m) => [m.id, m.ts]));
      tsMapRef.current = map;
      lastSigRef.current = initialRef.current
        .filter((m) => m.text.trim().length > 0)
        .map((m) => `${m.id}:${m.text.trim().length}`)
        .join("|");
    }

    const settled: ConversationMessage[] = [];
    let next = Date.now();
    for (const e of entries) {
      if (e.inProgress) continue;
      const text = e.text.trim();
      if (!text) continue;
      let ts = map.get(e.id);
      if (ts === undefined) {
        // Answer bubbles carry their own persisted ts (set when recorded); keep
        // it so re-persisting never re-stamps them. Other turns get a fresh
        // monotonic stamp the first time they settle.
        ts = e.ts ?? next++;
        map.set(e.id, ts);
      }
      const message: ConversationMessage = { id: e.id, role: e.role, text, ts };
      // Preserve the special "answer" bubble metadata so re-persisting the thread
      // never strips a recorded try down to a plain user turn.
      if (e.kind === "answer") {
        message.kind = "answer";
        if (e.correct !== undefined) message.correct = e.correct;
        if (e.stepIndex !== undefined) message.stepIndex = e.stepIndex;
      }
      settled.push(message);
    }

    const sig = settled.map((m) => `${m.id}:${m.text.length}`).join("|");
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    onPersistRef.current(settled);
  }, [entries]);
}

/**
 * The unified conversation thread — restored prior turns, spoken (auto-
 * transcribed) turns, typed turns, and Koji's replies, in order.
 *
 * Scrolling is handled by `useChatScroll` (a shadcn-`MessageScroller`-style
 * stick-to-bottom + turn-anchor hook): it pins to the bottom only while the
 * learner is already there, anchors each new user turn near the TOP so Koji's
 * reply streams in below it, preserves the position when they scroll up, and
 * surfaces a floating "jump to latest" button only when there's unseen content
 * below. A subtle "Koji is thinking…" cue shows between an optimistic user turn
 * and the first tokens of the reply. Reduced motion makes every scroll instant.
 */
function ChatThread({
  entries,
  thinking,
  onGoToStep,
}: {
  entries: VoiceTranscriptEntry[];
  thinking: boolean;
  /** Jump to a recorded try's step (wired to the clickable answer bubbles). */
  onGoToStep?: (stepIndex: number) => void;
}) {
  const reduce = useReducedMotion();

  // Only turns with text (skip the brief empty in-progress placeholder items).
  const visible = useMemo(
    () => entries.filter((e) => e.text.length > 0),
    [entries],
  );
  // The lightweight shape the scroller tracks (new-turn detection + anchoring).
  // Answer bubbles are reported as "assistant" so the scroller treats them as a
  // pin-to-bottom append (they aren't questions awaiting a reply, so they must
  // NOT get the near-top user-turn anchor that would leave an empty gap below).
  const items = useMemo<ChatScrollItem[]>(
    () =>
      visible.map((e) => ({
        id: e.id,
        role: e.kind === "answer" ? "assistant" : e.role,
      })),
    [visible],
  );

  const { scrollRef, contentRef, spacerRef, isAtBottom, scrollToLatest } =
    useChatScroll(items, !!reduce);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation with Koji"
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div ref={contentRef} className="flex flex-col gap-2 px-4 py-2">
          {visible.map((entry) =>
            entry.kind === "answer" ? (
              <AnswerBubble
                key={entry.id}
                entry={entry}
                onGoToStep={onGoToStep}
              />
            ) : (
              <div
                key={entry.id}
                data-mid={entry.id}
                className={cn(
                  "koji-message-in max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  entry.role === "user"
                    ? "self-end bg-accent-soft/70 text-foreground"
                    : "self-start bg-surface text-foreground",
                )}
              >
                <span className="sr-only">
                  {entry.role === "user" ? "You said: " : "Koji said: "}
                </span>
                {entry.text}
                {entry.inProgress ? (
                  <span className="text-muted" aria-hidden>
                    {" "}
                    …
                  </span>
                ) : null}
              </div>
            ),
          )}
          {thinking ? <ThinkingBubble /> : null}
        </div>
        {/* Reserved space so a just-sent user turn can sit near the top before
            Koji's reply exists; the hook shrinks it as the reply fills in. */}
        <div ref={spacerRef} aria-hidden style={{ height: 0 }} />
      </div>

      {/* Jump-to-latest: only when there's unseen content below. Conditionally
          rendered (so it leaves the tab order when at the bottom); a centered
          pointer-events-none layer keeps it from blocking scroll/taps. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <AnimatePresence>
          {!isAtBottom ? (
            <motion.button
              key="jump-to-latest"
              type="button"
              onClick={scrollToLatest}
              aria-label="Jump to latest messages"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.9 }}
              transition={{ duration: reduce ? 0 : 0.16, ease: EASE_OUT_CUBIC }}
              className={cn(
                "pointer-events-auto grid size-9 touch-manipulation place-items-center rounded-full outline-none",
                "border border-border bg-surface text-foreground shadow-lg shadow-black/25",
                "[@media(hover:hover)]:hover:brightness-110 active:scale-95",
                "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 10 L12 16 L18 10" />
              </svg>
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * The "Koji is thinking…" cue — an assistant-aligned bubble with three breathing
 * dots (the shared `koji-typing-dot` keyframes; still under reduced motion). It
 * holds the spot between a just-sent user turn and Koji's first reply tokens.
 */
function ThinkingBubble() {
  return (
    <div className="koji-message-in max-w-[85%] self-start rounded-2xl bg-surface px-3 py-2.5">
      <span className="sr-only">Koji is thinking…</span>
      <span aria-hidden className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="koji-typing-dot size-1.5 rounded-full bg-muted"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
    </div>
  );
}

/**
 * A special "answer" bubble — a recorded Check submission woven into the thread.
 *
 * It is solid YELLOW and BORDERLESS, so it reads as visually distinct from the
 * learner's accent-soft user bubbles and Koji's surface bubbles, with a SUBTLE
 * ✓ / ✗ status glyph (correct / wrong). Clicking it jumps the learner back to
 * THAT exact step (its saved answer + verdict restored) — so the thread doubles
 * as a tappable record of every try. It advertises that affordance with a
 * pointer cursor + a subtle hover highlight; when no navigation handler is wired
 * (or the step is unknown) it renders as a plain, non-interactive bubble.
 */
function AnswerBubble({
  entry,
  onGoToStep,
}: {
  entry: VoiceTranscriptEntry;
  onGoToStep?: (stepIndex: number) => void;
}) {
  const correct = entry.correct === true;
  const navigable =
    onGoToStep !== undefined && typeof entry.stepIndex === "number";
  return (
    <button
      type="button"
      data-mid={entry.id}
      disabled={!navigable}
      onClick={
        navigable
          ? () => {
              if (entry.stepIndex !== undefined) onGoToStep(entry.stepIndex);
            }
          : undefined
      }
      aria-label={`Your answer: ${entry.text} — ${
        correct ? "correct" : "incorrect"
      }${navigable ? ". Go to this step." : ""}`}
      className={cn(
        "koji-message-in flex max-w-[85%] items-center gap-1.5 self-end rounded-2xl px-3 py-2 text-left text-sm font-semibold leading-relaxed outline-none",
        // Solid yellow, NO border — distinct from user (accent-soft) + Koji (surface).
        "bg-warning text-warning-foreground",
        // Clickable affordance: pointer + a subtle hover lift (instant under
        // reduced motion); disabled when there's no step to navigate to.
        navigable
          ? "cursor-pointer transition-[filter,transform] duration-150 motion-reduce:transition-none [@media(hover:hover)]:hover:brightness-105 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          : "cursor-default",
      )}
    >
      <span aria-hidden>{entry.text}</span>
      <AnswerStatusGlyph correct={correct} />
    </button>
  );
}

/** The subtle ✓ (correct) / ✗ (wrong) mark on an answer bubble (yellow-on-dark). */
function AnswerStatusGlyph({ correct }: { correct: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0 opacity-80"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {correct ? <path d="M5 13l4 4L19 7" /> : <path d="M6 6l12 12M18 6L6 18" />}
    </svg>
  );
}

/** Auto-grow ceiling for the text-only composer (~a few lines, then it scrolls). */
const COMPOSER_MAX_HEIGHT_PX = 140;

/**
 * The unified composer.
 *
 * While `VOICE_ENABLED` is false it's TEXT-ONLY: a roomy box (an auto-growing
 * multi-line `textarea`) with the send button (disabled while empty) docked
 * bottom-right INSIDE the box — no mic, no "+" button. Enter sends, Shift+Enter
 * makes a newline. Submitting posts an OPTIMISTIC turn into the realtime session
 * via `onSendText`; Koji replies in text.
 *
 * With `VOICE_ENABLED` true (the original behavior, kept intact below): in
 * **text mode** it's a text field + one round button that morphs between mic
 * (empty → enter voice mode) and send (typed → into the same realtime session).
 * In **voice mode (open mic + tap to send)** the field becomes a live waveform
 * and the right side follows the connection: a single yellow spinner while
 * connecting, which morphs into the blue send button (open mic — speak, then tap
 * to commit the turn) with a red stop button beside it once live. Voice mode is
 * entered ONLY by tapping the mic; typing keeps the text field even though
 * `sendText` also brings the session live in the background.
 */
function ChatComposer({
  voice,
  onSendText,
  revert,
}: {
  voice: RealtimeVoiceApi;
  /**
   * Optimistic text send (text-only branch). Voice branches use `voice` directly.
   * Returns `false` when the send was rejected outright, so the composer restores
   * the typed text it cleared on submit.
   */
  onSendText: (text: string) => boolean;
  /**
   * One-shot signal (a fresh object per revert) to restore a reverted turn's text
   * back into the composer + refocus, after VoiceControls undoes an optimistic
   * turn whose send/connect failed asynchronously.
   */
  revert: RevertSignal | null;
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Restore-friendly focus: drop the caret at the end of the (just-restored)
  // text. Shared by the synchronous reject path and the async `revert` signal so
  // a lost turn lands back in the box ready to edit/resend.
  const focusComposerEnd = useCallback(() => {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const end = el.value.length;
      try {
        el.setSelectionRange(end, end);
      } catch {
        // Some control types reject setSelectionRange; focus alone is enough.
      }
    });
  }, []);

  // Restore a reverted turn's text (FIX 1): VoiceControls bumps `revert` when an
  // optimistic turn is undone after a failure. Don't clobber anything the learner
  // has typed since — only refill an empty composer — then refocus to the end.
  // The write is deferred to a rAF (codebase convention — never setState
  // synchronously in an effect body), which also lets the refocus run a frame
  // after the value is restored so the caret lands at the end.
  useEffect(() => {
    if (!revert) return;
    const raf = requestAnimationFrame(() => {
      setDraft((cur) => (cur.trim().length > 0 ? cur : revert.text));
      focusComposerEnd();
    });
    return () => cancelAnimationFrame(raf);
  }, [revert, focusComposerEnd]);
  // The learner has asked to be in voice mode. The *effective* voice mode is
  // derived below from this + the live phase, so if the session ever dies we fall
  // back to the text field automatically — no effect/setState needed to "leave".
  const [voiceRequested, setVoiceRequested] = useState(false);
  const reduce = useReducedMotion();

  const isConnecting = voice.phase === "connecting";
  const isLive = voice.phase === "live";
  const voiceMode = voiceRequested && (isConnecting || isLive);
  // The mic⇄send flip is driven ONLY by typed characters — never focus.
  const hasText = draft.trim().length > 0;

  // Concrete morph endpoints (Motion can't tween `var(--token)` strings).
  const colors = useMemo(() => getMorphColors(), []);

  // --- Send guard: only commit a turn after the learner has actually spoken. ---
  // The waveform's AnalyserNode reports the live mic peak (`onLevel`); the first
  // time it crosses a small threshold the send button arms (via `handleLevel`).
  // It disarms on entering voice mode and after each send, so a silent mic never
  // fires an empty commit. (This is the fix for "I finished talking and pressed
  // the blue button and nothing happened": an *armed* tap now commits the turn +
  // asks Koji to respond.) A short fallback timer also arms it, so reduced-motion
  // users (whose waveform doesn't tap the mic) and the rare meter failure are
  // never locked out of sending.
  const [canSend, setCanSend] = useState(false);
  const canSendRef = useRef(false);
  const [turnEpoch, setTurnEpoch] = useState(0);

  const arm = useCallback(() => {
    if (canSendRef.current) return;
    canSendRef.current = true;
    setCanSend(true);
  }, []);

  const disarm = useCallback(() => {
    canSendRef.current = false;
    setCanSend(false);
  }, []);

  const handleLevel = useCallback(
    (level: number) => {
      if (level >= SPEECH_LEVEL_THRESHOLD) arm();
    },
    [arm],
  );

  // Fallback arm: a short timer per live turn so the send button is never
  // permanently dead when no mic level signal arrives (reduced motion / meter
  // failure). `turnEpoch` bumps on each send to restart the window. The only
  // state change here happens in the deferred timer callback, never in the
  // effect body.
  useEffect(() => {
    if (!isLive) return;
    const timer = window.setTimeout(arm, SEND_ARM_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [isLive, turnEpoch, arm]);

  // Auto-grow the text-only box to fit its content, up to a few lines, then it
  // scrolls. Layout effect so the height is right before paint (no flicker);
  // resetting to "auto" first lets it shrink when text is deleted. The box keeps a
  // CONSTANT radius (rounded-3xl == half the 48px single-line height), so it reads
  // as a pill on one line and a rounded rectangle once it grows — there's no shape
  // toggle to drive here, only the height changes as the content wraps.
  useLayoutEffect(() => {
    if (VOICE_ENABLED) return;
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    const next = Math.min(scrollH, COMPOSER_MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.style.overflowY = scrollH > COMPOSER_MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [draft]);

  // One send path for both branches: text-only posts optimistically (instant
  // bubble + dedupe-by-id on the echo); the voice-enabled branches keep posting
  // straight into the session. Clears the draft (and lets the box shrink back).
  const sendCurrent = () => {
    const text = draft.trim();
    if (!text) return;
    // Clear optimistically so the box empties instantly (and the auto-grow box
    // shrinks back), then restore if the send is rejected outright.
    setDraft("");
    const accepted = !VOICE_ENABLED
      ? onSendText(text)
      : voice.sendText(text) !== "failed";
    if (!accepted) {
      // Silent-failure path: the send couldn't even be handed off. Put the text
      // back + refocus so the learner can retry without retyping. (A turn that
      // WAS accepted but later fails to connect comes back via `revert` instead.)
      setDraft(text);
      focusComposerEnd();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    sendCurrent();
  };

  // Enter sends, Shift+Enter inserts a newline. Ignore Enter mid-IME-composition
  // so composing (e.g. CJK) isn't cut short.
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    sendCurrent();
  };

  // Enter voice mode: connect with the mic OPEN (open mic — no push-to-talk hold).
  const startVoice = () => {
    disarm();
    setVoiceRequested(true);
    voice.startVoiceSession();
  };

  const stopVoice = () => {
    disarm();
    setVoiceRequested(false);
    voice.endSession();
  };

  // Tap to send: commit the current spoken turn + ask Koji to reply, then disarm
  // until the learner speaks again. Guarded so a silent tap is a no-op.
  const sendTurn = () => {
    if (!canSendRef.current) return;
    disarm();
    setTurnEpoch((epoch) => epoch + 1);
    voice.sendTurn();
  };

  const primaryDisabled = isConnecting || (isLive && !canSend);

  // Text-mode button: mic (empty) ⇄ send (typed), via the cross-fade morph.
  const textIcon: "mic" | "send" = hasText ? "send" : "mic";

  return (
    <form
      onSubmit={submit}
      className="flex shrink-0 items-center gap-2 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]"
    >
      {!VOICE_ENABLED ? (
        // Text-only composer (VOICE_ENABLED === false): a roomy box — an
        // auto-growing multi-line textarea with the send button docked
        // bottom-right INSIDE the box (shadcn InputGroup look). No mic, no
        // mic↔send morph, no "+" button, no way to enter voice mode. Submitting
        // posts optimistically via `onSendText`. The voice-mode branches below
        // stay intact, gated behind the flag.
        <div
          className={cn(
            "relative w-full border border-border bg-surface",
            // ChatGPT-style shape with a CONSTANT radius in BOTH states: one radius
            // (rounded-3xl = 24px) equal to HALF the 48px single-line height, so a
            // single line reads as a pill (24px == h/2 → semicircle ends) and a
            // grown box reads as a rounded rectangle. No rounded-full↔rounded-3xl
            // toggle and NO border-radius transition, so the corner never "unrolls"
            // — only the height changes as the content wraps. Border stays the same
            // gray (border-border) in every state: no hover/focus color change.
            "rounded-3xl",
          )}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onComposerKeyDown}
            placeholder="Message Koji…"
            aria-label="Message Koji"
            enterKeyHint="send"
            autoComplete="off"
            className={cn(
              "block max-h-[140px] w-full resize-none bg-transparent",
              // A 24px line box (leading-6) + py-3 (12px × 2) = a 48px single-line
              // height, so the constant rounded-3xl (24px) is exactly height/2 →
              // perfect pill ends. `pr-14` reserves the send button's right gutter
              // in EVERY shape, so the text wrap width never changes as the box
              // grows and the button never overlaps the text.
              "py-3 pl-4 pr-14 text-sm leading-6 text-foreground outline-none",
              "placeholder:text-muted",
            )}
          />
          <button
            type="submit"
            disabled={!hasText}
            aria-label="Send message"
            className={cn(
              // Anchored BOTTOM-RIGHT in BOTH states with an equal 4px margin on
              // the right and the top/bottom, and sized (size-10 = 40px) to nearly
              // fill the 48px line — so the 40px circle nests CONCENTRICALLY inside
              // the 24px rounded end (a uniform 4px gap all around). It therefore
              // reads vertically centered when single-line and stays bottom-right
              // as the box grows: no reposition jump, only the height changes.
              "absolute bottom-1 right-1 grid size-10 touch-manipulation place-items-center rounded-full outline-none",
              "bg-accent text-accent-foreground",
              "transition-[transform,opacity] duration-200 ease-[var(--ease-out-cubic)] motion-reduce:transition-none",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "enabled:[@media(hover:hover)]:hover:brightness-110 enabled:active:scale-95",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            <SendGlyph />
          </button>
        </div>
      ) : voiceMode ? (
        <>
          {/* The live waveform stands in for the text field while talking; its
              mic meter also arms the send button via onLevel. */}
          <KojiWaveform
            listening={voice.listening}
            connected={isLive}
            onLevel={handleLevel}
            className="flex-1"
          />
          {/* Primary circle — the SAME element across connecting → live, so its
              background springs yellow → blue while the icon crossfades from the
              spinner to the up-arrow send glyph. */}
          <motion.button
            type="button"
            disabled={primaryDisabled}
            onClick={isLive ? sendTurn : undefined}
            aria-label={isConnecting ? "Connecting to Koji" : "Send to Koji"}
            aria-busy={isConnecting}
            initial={false}
            animate={{
              backgroundColor: isLive ? colors.liveBg : colors.connectBg,
              color: isLive ? colors.liveFg : colors.connectFg,
            }}
            transition={reduce ? { duration: 0 } : MORPH_SPRING}
            style={{ willChange: "transform" }}
            className={cn(
              "relative grid size-11 shrink-0 touch-manipulation place-items-center rounded-full outline-none",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed",
              !primaryDisabled &&
                "[@media(hover:hover)]:hover:brightness-110 active:scale-95",
              isLive && !canSend && "opacity-60",
            )}
          >
            <span className="relative grid size-6 place-items-center">
              <AnimatePresence initial={false}>
                <motion.span
                  key={isLive ? "send" : "connecting"}
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  transition={{ duration: reduce ? 0 : 0.18, ease: EASE_OUT_CUBIC }}
                  className="absolute inset-0 grid place-items-center"
                >
                  {isLive ? <SendGlyph /> : <Spinner />}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.button>
          {/* Red stop button: animates in (scale + fade) once live; there's no
              stop control while connecting. */}
          <AnimatePresence>
            {isLive ? (
              <motion.div
                key="stop"
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                transition={reduce ? { duration: 0 } : MORPH_SPRING}
                style={{ willChange: "transform" }}
                className="shrink-0"
              >
                <StopButton onPress={stopVoice} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : (
        <>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message Koji…"
            aria-label="Message Koji"
            enterKeyHint="send"
            autoComplete="off"
            className="min-h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted hover:border-border focus:border-border focus-visible:border-border"
          />
          <button
            type={hasText ? "submit" : "button"}
            onClick={hasText ? undefined : startVoice}
            aria-label={hasText ? "Send message" : "Talk to Koji"}
            aria-pressed={hasText ? undefined : false}
            className={cn(
              "relative grid size-11 shrink-0 touch-manipulation place-items-center rounded-full outline-none",
              "bg-accent text-accent-foreground [@media(hover:hover)]:hover:brightness-110",
              "transition-[background-color,color,transform] duration-200 ease-[var(--ease-out-cubic)] motion-reduce:transition-none",
              "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "active:scale-95",
            )}
          >
            {/* Icon morph — a quick cross-fade + slight scale between mic/send. */}
            <span className="relative grid size-6 place-items-center">
              <AnimatePresence initial={false}>
                <motion.span
                  key={textIcon}
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                  transition={{ duration: reduce ? 0 : 0.15, ease: EASE_OUT_CUBIC }}
                  className="absolute inset-0 grid place-items-center"
                >
                  {textIcon === "send" ? <SendGlyph /> : <MicGlyph />}
                </motion.span>
              </AnimatePresence>
            </span>
          </button>
        </>
      )}
    </form>
  );
}

/** End the voice session and return to the text field. Red, no pulse rings. */
function StopButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label="Stop talking"
      className={cn(
        "grid size-11 shrink-0 touch-manipulation place-items-center rounded-full outline-none",
        "bg-danger text-danger-foreground [@media(hover:hover)]:hover:brightness-110",
        "transition-transform duration-150 ease-[var(--ease-out-cubic)] motion-reduce:transition-none active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <StopGlyph />
    </button>
  );
}

function MicGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M6 11a6 6 0 0 0 12 0M12 17v3"
      />
    </svg>
  );
}

function StopGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  );
}

function SendGlyph() {
  // Up-arrow send glyph (white via currentColor on the accent button).
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 29 L16 3" />
      <path d="M26 13 L16 3 L6 13" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-6 motion-safe:animate-spin">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="44"
        strokeDashoffset="14"
        opacity="0.9"
      />
    </svg>
  );
}
