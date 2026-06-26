/**
 * VoiceControls (PRD-phase-2 §4.1): the in-panel mic surface for talking to Koji.
 *
 * - **Tap-to-talk by default** with an optional **hands-free / always-listening**
 *   toggle. The big mic button connects on first tap, then opens/closes the mic.
 * - A **live transcript** of the spoken conversation (user + Koji), auto-scrolled.
 * - Clear **connecting / listening / speaking / thinking / error** states, plus a
 *   **barge-in** "Stop" while Koji is speaking.
 * - **AI-off:** renders nothing (the hook reports `aiEnabled:false`).
 * - **Graceful fallback:** unsupported browsers / token / mic / connection
 *   failures show a small "voice unavailable — keep going in text" state with a
 *   retry; the lesson is never blocked.
 *
 * All state lives in `useRealtimeVoice`; this component is purely presentational
 * plus the engagement wiring (first speech → `markTalkedToKoji`).
 */
import { useEffect, useMemo, useRef } from "react";

import type { ToolContext } from "../../../lib/ai/tools";
import {
  useRealtimeVoice,
  type RealtimeVoiceApi,
  type VoiceErrorReason,
} from "../../../lib/ai/voice";
import { cn } from "../../../lib/cn";
import { Button } from "../../ui";

export interface VoiceControlsProps {
  /** Live tool context (learner + step + grounding + engagement). */
  ctx: ToolContext;
}

interface StatusCopy {
  title: string;
  hint: string;
}

function errorCopy(reason: VoiceErrorReason | null): StatusCopy {
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

function statusCopy(v: RealtimeVoiceApi): StatusCopy {
  if (v.phase === "error") return errorCopy(v.errorReason);
  if (v.phase === "connecting") {
    return { title: "Connecting…", hint: "Getting the mic ready" };
  }
  if (v.phase === "idle") {
    return {
      title: v.handsFree ? "Start talking" : "Tap to talk",
      hint: "Talk it through with Koji",
    };
  }
  // live
  if (v.speaking) {
    return { title: "Koji is speaking", hint: "Tap the mic to jump in" };
  }
  if (v.responding) return { title: "Koji is thinking…", hint: "" };
  if (v.listening) {
    return {
      title: "Listening…",
      hint: v.handsFree ? "Speak anytime" : "Tap when you're done",
    };
  }
  return {
    title: v.handsFree ? "Paused" : "Tap to talk",
    hint: v.handsFree ? "Mic is muted" : "",
  };
}

export function VoiceControls({ ctx }: VoiceControlsProps) {
  const engagement = ctx.engagement;
  const voice = useRealtimeVoice({
    getContext: () => ctx,
    // Talking with Koji counts as engagement (unlocks the reveal "talked" path).
    onUserSpoke: () => engagement.markTalkedToKoji(),
  });

  // AI-off (defensive — the panel is already gated): render nothing.
  if (!voice.aiEnabled) return null;

  // No WebRTC / mic support: a calm, non-blocking fallback — text still works.
  if (!voice.supported) {
    return (
      <section
        aria-label="Talk to Koji"
        className="border-t border-border px-4 py-3"
      >
        <p className="text-xs leading-relaxed text-muted">
          Voice is unavailable on this device — keep going in text.
        </p>
      </section>
    );
  }

  const { title, hint } = statusCopy(voice);
  const isLive = voice.phase === "live";
  const isError = voice.phase === "error";
  const isConnecting = voice.phase === "connecting";
  const micActive = isLive && voice.listening;

  const micLabel = isError
    ? "Try voice again"
    : micActive
      ? "Stop the microphone"
      : isConnecting
        ? "Connecting"
        : "Start talking to Koji";

  return (
    <section
      aria-label="Talk to Koji"
      className="flex flex-col gap-3 border-t border-border px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <MicButton
          active={micActive}
          speaking={voice.speaking}
          connecting={isConnecting}
          error={isError}
          label={micLabel}
          onPress={voice.toggleMic}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {voice.speaking ? <Equalizer /> : null}
            <p
              className="truncate text-sm font-semibold leading-tight text-foreground"
              aria-live="polite"
            >
              {title}
            </p>
          </div>
          {hint ? <p className="text-xs leading-snug text-muted">{hint}</p> : null}
        </div>

        {voice.speaking ? (
          <Button
            size="sm"
            variant="secondary"
            clicky={false}
            className="min-h-11"
            onPress={voice.stopSpeaking}
          >
            Stop
          </Button>
        ) : isError ? (
          <Button
            size="sm"
            variant="secondary"
            clicky={false}
            className="min-h-11"
            onPress={voice.retry}
          >
            Try again
          </Button>
        ) : isLive ? (
          <Button
            size="sm"
            variant="secondary"
            clicky={false}
            className="min-h-11"
            onPress={voice.endSession}
          >
            End
          </Button>
        ) : null}
      </div>

      {!isError ? (
        <HandsFreeToggle
          checked={voice.handsFree}
          onChange={voice.setHandsFree}
        />
      ) : null}

      <VoiceTranscript voice={voice} />
    </section>
  );
}

interface MicButtonProps {
  active: boolean;
  speaking: boolean;
  connecting: boolean;
  error: boolean;
  label: string;
  onPress: () => void;
}

/** The primary circular mic control, with a listening pulse + speaking cue. */
function MicButton({
  active,
  speaking,
  connecting,
  error,
  label,
  onPress,
}: MicButtonProps) {
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
          : error
            ? "bg-default text-muted"
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

interface HandsFreeToggleProps {
  checked: boolean;
  onChange: (on: boolean) => void;
}

/** Accessible switch toggling hands-free / always-listening. */
function HandsFreeToggle({ checked, onChange }: HandsFreeToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 touch-manipulation items-center gap-2 self-start rounded-full py-1 text-xs font-medium text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors duration-200 motion-reduce:transition-none",
          checked ? "bg-accent" : "bg-default",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow transition-transform duration-200 motion-reduce:transition-none",
            checked && "translate-x-4",
          )}
        />
      </span>
      <span className={cn(checked && "text-foreground")}>Hands-free</span>
    </button>
  );
}

/** The live conversation transcript, auto-scrolled to the latest turn. */
function VoiceTranscript({ voice }: { voice: RealtimeVoiceApi }) {
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

  if (entries.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-2xl bg-default/40 p-3"
      aria-label="Voice transcript"
    >
      {entries.map((entry) => (
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
              …
            </span>
          ) : null}
        </div>
      ))}
    </div>
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

/**
 * A tiny equalizer that signals live audio while Koji is speaking. Decorative
 * (aria-hidden) — the spoken status is already announced via the status line.
 * Bars scale on the Y axis only (compositor-only); reduced motion holds them.
 */
function Equalizer() {
  return (
    <span aria-hidden className="flex h-3.5 items-end gap-[3px]">
      {[0, 150, 300, 90].map((delay) => (
        <span
          key={delay}
          className="koji-eq-bar block h-full w-[3px] rounded-full bg-accent"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function StopGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5">
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
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
