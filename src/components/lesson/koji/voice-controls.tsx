/**
 * VoiceControls (PRD-phase-2 §4.1): the in-panel surface for talking *and* typing
 * to Koji — one unified thread.
 *
 * Layout (top → bottom):
 *  - **Voice row:** a live mic waveform on the left (so the learner can see audio
 *    is connected) + the connect/listen mic button on the right. Tap-to-talk by
 *    default; tapping while Koji speaks barges in; VAD/hands-free stays enabled
 *    under the hood. A tiny status word is the only chrome.
 *  - **Chat thread:** the realtime session transcript — the learner's spoken
 *    (auto-transcribed) turns, their typed turns, and Koji's replies, in order,
 *    auto-scrolled to the latest.
 *  - **Composer:** a text input. Typing sends into the *same* realtime session
 *    via `sendText`, so Koji answers by voice and the reply lands in the thread.
 *    If the session isn't live yet, the hook connects first then flushes.
 *
 * AI-off / unsupported: renders nothing (voice and the text chat both ride the
 * realtime session). Connection failures surface as a bottom-left HeroUI toast —
 * there is no inline error UI here.
 *
 * All voice state lives in `useRealtimeVoice`; this component is presentational
 * plus the engagement wiring (first speech / first typed turn → `markTalkedToKoji`).
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "@heroui/react";

import type { ToolContext } from "../../../lib/ai/tools";
import {
  useRealtimeVoice,
  type RealtimeVoiceApi,
  type VoiceErrorReason,
} from "../../../lib/ai/voice";
import { cn } from "../../../lib/cn";
import { KojiWaveform } from "./koji-waveform";

export interface VoiceControlsProps {
  /** Live tool context (learner + step + grounding + engagement). */
  ctx: ToolContext;
}

interface ErrorCopy {
  title: string;
  hint: string;
}

/** Map a typed voice error to user-meaningful toast copy. */
export function errorCopy(reason: VoiceErrorReason | null): ErrorCopy {
  switch (reason) {
    case "mic-permission":
      return {
        title: "Microphone blocked",
        hint: "Allow mic access and try again — or keep going in text.",
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

export function VoiceControls({ ctx }: VoiceControlsProps) {
  const engagement = ctx.engagement;
  const voice = useRealtimeVoice({
    getContext: () => ctx,
    // Talking with Koji counts as engagement (unlocks the reveal "talked" path).
    onUserSpoke: () => engagement.markTalkedToKoji(),
  });

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
    toast.danger(title, { description: hint });
  }, [voice.phase, voice.errorReason]);

  // AI-off (defensive — the panel is already gated): render nothing.
  if (!voice.aiEnabled) return null;
  // No WebRTC: both voice and the unified text chat ride the realtime session,
  // so there's nothing to show here. The hint cards below still work.
  if (!voice.supported) return null;

  const isLive = voice.phase === "live";
  const isConnecting = voice.phase === "connecting";
  const micActive = isLive && voice.listening;

  const status = isConnecting
    ? "Connecting…"
    : voice.responding
      ? "Koji is thinking…"
      : voice.speaking
        ? "Koji is speaking"
        : micActive
          ? "Listening…"
          : "";

  const micLabel = isConnecting
    ? "Connecting"
    : micActive
      ? "Stop the microphone"
      : voice.speaking
        ? "Tap to jump in"
        : isLive
          ? "Start talking"
          : "Talk to Koji";

  return (
    <section
      aria-label="Talk or type to Koji"
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Voice row: live mic waveform (left) + the mic button (right). */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-1">
        <KojiWaveform listening={micActive} connected={isLive} className="flex-1" />
        <MicButton
          active={micActive}
          speaking={voice.speaking}
          connecting={isConnecting}
          label={micLabel}
          onPress={voice.toggleMic}
        />
      </div>
      <p
        className="min-h-[1.1rem] shrink-0 px-4 pt-1 text-center text-xs text-muted"
        aria-live="polite"
      >
        {status}
      </p>

      <ChatThread voice={voice} />

      <ChatComposer onSend={voice.sendText} />
    </section>
  );
}

interface MicButtonProps {
  active: boolean;
  speaking: boolean;
  connecting: boolean;
  label: string;
  onPress: () => void;
}

/** The primary circular mic control, with a listening pulse + speaking cue. */
function MicButton({ active, speaking, connecting, label, onPress }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={connecting}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative grid size-14 shrink-0 touch-manipulation place-items-center rounded-full outline-none transition-[background-color,color,transform] duration-200 ease-[var(--ease-out-cubic)] motion-reduce:transition-none",
        "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100",
        active
          ? "bg-warning text-warning-foreground"
          : "bg-accent text-accent-foreground [@media(hover:hover)]:hover:brightness-110",
      )}
    >
      {/* Listening — soft concentric rings expand outward (compositor-only). */}
      {active ? (
        <>
          <span
            aria-hidden
            className="koji-mic-ring absolute inset-0 rounded-full bg-warning/40"
          />
          <span
            aria-hidden
            className="koji-mic-ring absolute inset-0 rounded-full bg-warning/30"
            style={{ animationDelay: "0.6s" }}
          />
        </>
      ) : null}
      {/* Koji speaking (mic idle) — a calm accent halo cueing "tap to jump in". */}
      {speaking && !active ? (
        <span
          aria-hidden
          className="koji-mic-ring absolute inset-0 rounded-full bg-accent/40"
        />
      ) : null}
      <span className="relative">
        {connecting ? <Spinner /> : active ? <StopGlyph /> : <MicGlyph />}
      </span>
    </button>
  );
}

/**
 * The unified conversation thread — spoken (auto-transcribed) turns, typed turns,
 * and Koji's replies, in order, auto-scrolled to the latest. Reads straight from
 * the realtime session transcript so talking and typing share one history.
 */
function ChatThread({ voice }: { voice: RealtimeVoiceApi }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only turns with text (skip the brief empty in-progress placeholder items).
  const entries = useMemo(
    () => voice.transcript.filter((e) => e.text.length > 0),
    [voice.transcript],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [entries]);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation with Koji"
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-2"
    >
      {entries.length === 0 ? (
        <p className="koji-message-in py-6 text-center text-sm leading-relaxed text-muted">
          Talk or type to ask Koji anything — no spoilers, just nudges.
        </p>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
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
        ))
      )}
    </div>
  );
}

/** A text input that sends into the same realtime session (Koji replies by voice). */
function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <form
      onSubmit={submit}
      className="flex shrink-0 items-center gap-2 border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]"
    >
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Message Koji…"
        aria-label="Message Koji"
        enterKeyHint="send"
        autoComplete="off"
        className="min-h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
      />
      <button
        type="submit"
        disabled={draft.trim().length === 0}
        aria-label="Send message"
        className={cn(
          "grid size-11 shrink-0 touch-manipulation place-items-center rounded-full bg-accent text-accent-foreground outline-none",
          "transition-[opacity,transform] duration-150 active:scale-95 motion-reduce:transition-none",
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
          "[@media(hover:hover)]:hover:brightness-110",
        )}
      >
        <SendGlyph />
      </button>
    </form>
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
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <path
        fill="currentColor"
        d="M3.4 20.4 21 12 3.4 3.6 3 10l12 2-12 2 .4 6.4Z"
      />
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
