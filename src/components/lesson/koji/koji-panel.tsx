/**
 * The in-lesson Koji panel (PRD-phase-2 §4.1): the tappable tutor surface that
 * turns the dormant mascot into progressive text hints, a personalized
 * wrong-answer explanation, and the effort-gated reveal.
 *
 * Everything here is driven by the typed app tools (`giveHint`, `explainMiss`,
 * `revealSolution`) against a live `ToolContext`, so the same grounded logic that
 * powers the (future) voice agent powers this text surface. The panel only ever
 * renders when AI is on — the host gates it behind `aiEnabled()` — so with AI off
 * it doesn't exist and the lesson is byte-for-byte Phase 1.
 *
 * Safety: every model-phrased hint/explanation is passed through
 * `hintLeaksAnswer` (a client-side second gate, defense-in-depth for W1) before
 * display; on a leak — or any AI error/off — it falls back to the step's static
 * `HintRule` / `Feedback`, so the learner is never stuck and never spoiled.
 *
 * Structure: `KojiPanel` owns the conversation state + tool calls (it stays
 * mounted across open/close so the transcript survives); the presentational
 * `KojiSheet` mounts only while open, so its enter animation re-arms each time.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { Step } from "../../../content/types";
import { hintLeaksAnswer } from "../../../lib/ai/verify";
import {
  explainMiss,
  giveHint,
  revealSolution,
  staticHint,
  type HintLevel,
  type RevealAllowed,
  type ToolContext,
} from "../../../lib/ai/tools";
import { cn } from "../../../lib/cn";
import { Button } from "../../ui";
import { renderMathText } from "../../ui/math";
import type { StepPhase } from "../step-view";
import { KojiMascot } from "./koji-mascot";
import { VoiceControls } from "./voice-controls";

/** The Koji header avatar waves on a fixed ~5s cadence. Module-level so the
 *  reference stays stable (won't re-arm KojiMascot's loop on re-render). */
const KOJI_HEADER_WAVE = ["waveLeft", "waveRight"] as const;

export interface KojiPanelProps {
  /** Whether the panel is shown. */
  open: boolean;
  /** Dismiss the panel. */
  onClose: () => void;
  /** Live tool context (learner + step + grounding + engagement). */
  ctx: ToolContext;
  /** The current step (concept or problem). */
  step: Step;
  /** Grading phase, so the panel offers the right actions. */
  phase: StepPhase;
  /**
   * Whether the reveal effort-gate is satisfied (a genuine attempt AND Koji
   * engagement). The tool re-checks this source-of-truth side; this just drives
   * the button's enabled state + helper copy.
   */
  revealReady: boolean;
  /**
   * Monotonic token: bump it to auto-request a hint (the host bumps it after the
   * learner's 2nd wrong attempt — PRD §4.1 "auto-offered after ≥2 wrong").
   */
  autoHintToken: number;
  /** Apply an unlocked reveal back into the lesson (fill the answer, mark revealed). */
  onRevealed: (result: RevealAllowed) => void;
}

/** What Koji has said this step (the small grounded transcript). */
type KojiMessageInit =
  | { role: "koji"; text: string }
  | { role: "hint"; level: HintLevel; text: string }
  | { role: "explain"; text: string }
  | {
      role: "reveal";
      gap: string;
      worked: string;
      answerText: string;
      narrative: string | null;
    };
type KojiMessage = KojiMessageInit & { id: number };

function hintLabel(count: number): string {
  if (count === 0) return "Ask for a hint";
  return count >= 3 ? "One more hint" : "Another hint";
}

export function KojiPanel({
  open,
  onClose,
  ctx,
  step,
  phase,
  revealReady,
  autoHintToken,
  onRevealed,
}: KojiPanelProps) {
  const [messages, setMessages] = useState<KojiMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [hintCount, setHintCount] = useState(0);

  const idRef = useRef(0);
  const autoHintHandledRef = useRef(0);

  const isProblem = step.kind === "problem";
  const resolved = phase === "correct" || phase === "revealed";

  const pushMessage = useCallback((init: KojiMessageInit) => {
    const id = idRef.current++;
    setMessages((prev) => [...prev, { ...init, id }]);
  }, []);

  // --- Progressive hint (Tier 1 → 3): grounded, then leak-gated client-side. ---
  const requestHint = useCallback(async () => {
    if (busy || step.kind !== "problem") return;
    const problem = step; // narrowed; held across the await for the leak check
    setBusy(true);
    const level = Math.min(hintCount + 1, 3) as HintLevel;
    try {
      const res = await giveHint.handler({ level }, ctx);
      let text = res.text ?? "";
      // W1 second gate: a model hint that leaks the answer is dropped for the
      // hand-written fallback. We bias to flagging — a false positive only costs
      // a static hint, a miss would spoil the answer.
      if (res.source === "ai" && text && hintLeaksAnswer(text, problem)) {
        text = staticHint(problem, ctx.step?.answer ?? null);
      }
      if (!text) text = staticHint(problem, ctx.step?.answer ?? null);
      pushMessage({ role: "hint", level, text });
      setHintCount((c) => c + 1);
    } finally {
      setBusy(false);
    }
  }, [busy, hintCount, step, ctx, pushMessage]);

  // --- Personalized "why was that wrong?" (deterministic diagnosis + phrasing). ---
  const requestExplain = useCallback(async () => {
    if (busy || step.kind !== "problem") return;
    const problem = step;
    setBusy(true);
    try {
      const res = await explainMiss.handler({}, ctx);
      const fallback = res.diagnosis?.summary ?? problem.feedback.default;
      let text = res.text ?? "";
      if (res.source === "ai" && text && hintLeaksAnswer(text, problem)) text = fallback;
      if (!text) text = fallback;
      pushMessage({ role: "explain", text });
    } finally {
      setBusy(false);
    }
  }, [busy, step, ctx, pushMessage]);

  // --- Effort-gated reveal: engine-computed answer + personalized gap. ---
  const requestReveal = useCallback(async () => {
    if (busy || step.kind !== "problem") return;
    setBusy(true);
    try {
      const res = await revealSolution.handler({}, ctx);
      if (!res.allowed) {
        // The tool returns a teaching reason ("try it first" / "ask for a hint").
        pushMessage({ role: "koji", text: res.reason });
        return;
      }
      pushMessage({
        role: "reveal",
        gap: res.diagnosis.summary,
        worked: res.worked,
        answerText: res.answerText,
        narrative: res.narrative,
      });
      onRevealed(res);
    } finally {
      setBusy(false);
    }
  }, [busy, step, ctx, onRevealed, pushMessage]);

  // Auto-offer a hint once the host bumps the token (≥2 wrong attempts).
  useEffect(() => {
    if (autoHintToken > 0 && autoHintToken !== autoHintHandledRef.current) {
      autoHintHandledRef.current = autoHintToken;
      void requestHint();
    }
  }, [autoHintToken, requestHint]);

  // Keep the sheet mounted while it plays its exit animation, then unmount on
  // its `onAnimationEnd` (the same data-state pattern as the streak popover).
  // Mounting is deferred to the next frame so the CSS enter animation arms
  // cleanly. Presentational only — `onClose` still fires the instant the learner
  // dismisses; this only defers the unmount by one exit animation.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!mounted) return null;

  const intro = isProblem
    ? "Stuck? Ask me for a hint and I'll nudge you in the right direction — no spoilers."
    : "Read through the idea — I'll be right here when you reach the practice problems.";

  return (
    <KojiSheet
      open={open}
      onClosed={() => setMounted(false)}
      onClose={onClose}
      messages={messages}
      busy={busy}
      intro={intro}
      isProblem={isProblem}
      resolved={resolved}
      phase={phase}
      revealReady={revealReady}
      hintCount={hintCount}
      onHint={() => void requestHint()}
      onExplain={() => void requestExplain()}
      onReveal={() => void requestReveal()}
      voice={<VoiceControls ctx={ctx} />}
    />
  );
}

interface KojiSheetProps {
  /** Drives the enter (true) / exit (false) animation via `data-state`. */
  open: boolean;
  /** Fired once the exit animation finishes, so `KojiPanel` can unmount it. */
  onClosed: () => void;
  onClose: () => void;
  messages: KojiMessage[];
  busy: boolean;
  intro: string;
  isProblem: boolean;
  resolved: boolean;
  phase: StepPhase;
  revealReady: boolean;
  hintCount: number;
  onHint: () => void;
  onExplain: () => void;
  onReveal: () => void;
  /** The mic surface (tap-to-talk + hands-free + live transcript). */
  voice: ReactNode;
}

/**
 * The presentational bottom-sheet. Mounts only while open (so its enter
 * animation re-arms each time) and owns focus, Escape-to-close, and auto-scroll.
 */
function KojiSheet({
  open,
  onClosed,
  onClose,
  messages,
  busy,
  intro,
  isProblem,
  resolved,
  phase,
  revealReady,
  hintCount,
  onHint,
  onExplain,
  onReveal,
  voice,
}: KojiSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Move focus into the sheet on open; Escape closes it.
  useEffect(() => {
    sheetRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the latest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-label="Ask Koji"
    >
      <div
        aria-hidden
        onClick={onClose}
        data-state={open ? "open" : "closed"}
        className="koji-backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div
        ref={sheetRef}
        tabIndex={-1}
        data-state={open ? "open" : "closed"}
        onAnimationEnd={(event) => {
          // Ignore child animations (message bubbles, etc.) bubbling up; only the
          // sheet's own exit animation unmounts it.
          if (event.target !== event.currentTarget) return;
          if (!open) onClosed();
        }}
        className={cn(
          "koji-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[78svh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-background shadow-2xl shadow-black/40 outline-none",
          "transform-gpu will-change-transform",
          "sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm sm:rounded-3xl",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <KojiMascot
            size="size-9"
            className="shrink-0"
            reactions={KOJI_HEADER_WAVE}
            loopIntervalMs={5000}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">Koji</p>
            <p className="truncate text-xs text-muted">Your study buddy</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Koji"
            className="relative -mr-1 ml-auto grid size-9 shrink-0 touch-manipulation place-items-center rounded-full text-muted outline-none transition-colors before:absolute before:-inset-1.5 before:content-[''] hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
          >
            <svg aria-hidden viewBox="0 0 16 16" className="size-4">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && !busy ? (
            <p className="koji-message-in text-sm leading-relaxed text-muted">
              {intro}
            </p>
          ) : null}
          {messages.map((message) => (
            <KojiBubble key={message.id} message={message} />
          ))}
          {busy ? <TypingIndicator /> : null}
        </div>

        {voice}

        <footer className="flex flex-col gap-2 border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]">
          {!isProblem ? (
            <p className="text-sm text-muted">
              Work through the idea — I&apos;m here when you reach the practice problems.
            </p>
          ) : resolved ? (
            <p className="text-sm text-muted">
              {phase === "correct"
                ? "Nice work! Tap Continue when you're ready."
                : "There's the answer and the gap behind it — give the next one a go."}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-11"
                  isDisabled={busy}
                  onPress={onHint}
                >
                  {hintLabel(hintCount)}
                </Button>
                {phase === "wrong" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-11"
                    isDisabled={busy}
                    onPress={onExplain}
                  >
                    Why was that wrong?
                  </Button>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="warning"
                className="min-h-11"
                isDisabled={busy || !revealReady}
                onPress={onReveal}
              >
                Reveal the answer
              </Button>
              {!revealReady ? (
                <p className="text-xs leading-relaxed text-muted">
                  Give it a real try and ask me for a hint first — then I can reveal the
                  worked answer.
                </p>
              ) : null}
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

/** A single Koji utterance, styled by kind. */
function KojiBubble({ message }: { message: KojiMessage }) {
  if (message.role === "reveal") {
    return (
      <div className="koji-message-in rounded-2xl border border-border bg-default/60 p-3.5">
        <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">
          Here&apos;s the answer
        </p>
        <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
          {renderMathText(message.answerText)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {renderMathText(message.narrative ?? message.gap)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {renderMathText(message.worked)}
        </p>
      </div>
    );
  }

  const label =
    message.role === "hint"
      ? `Hint ${message.level}`
      : message.role === "explain"
        ? "Why that was off"
        : null;

  return (
    <div className="koji-message-in rounded-2xl bg-accent-soft/60 p-3.5">
      {label ? (
        <p className="text-[0.7rem] font-bold uppercase tracking-wider tabular-nums text-accent-soft-foreground">
          {label}
        </p>
      ) : null}
      <p className={cn("text-sm leading-relaxed text-foreground", label && "mt-1")}>
        {renderMathText(message.text)}
      </p>
    </div>
  );
}

/** "Koji is thinking" — three dots breathe in a gentle wave (transform/opacity
 * only, 60fps; reduced motion leaves three dimmed dots). */
function TypingIndicator() {
  return (
    <div
      className="koji-message-in flex w-fit items-center gap-1.5 rounded-2xl bg-accent-soft/60 px-3.5 py-3.5"
      role="status"
      aria-label="Koji is thinking"
    >
      {[0, 160, 320].map((delay) => (
        <span
          key={delay}
          className="koji-typing-dot size-1.5 rounded-full bg-accent opacity-60"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}
