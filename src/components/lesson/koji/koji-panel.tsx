/**
 * The in-lesson Koji panel (PRD-phase-2 §4.1): the tappable tutor surface.
 *
 * Layout, top → bottom:
 *  1. Koji's Rive mascot, prominent + centered (he animates + waves on a gentle
 *     loop), with a small close (X) in the corner.
 *  2. `VoiceControls`: a live mic waveform + mic button, then a UNIFIED voice/text
 *     thread (spoken + typed turns + Koji's replies) with a text composer.
 *  3. `HintCards`: progressive hint tiers as a click-to-advance flip card (only
 *     for unresolved problems).
 *
 * Everything here is driven by the typed app tools against a live `ToolContext`,
 * so the same grounded logic powers the text + voice surfaces. The panel only
 * renders when AI is on — the host gates it behind `aiEnabled()` — so with AI off
 * it doesn't exist and the lesson is byte-for-byte Phase 1.
 *
 * Safety: hint text is passed through `hintLeaksAnswer` (a client-side second
 * gate, W1) before display and falls back to the step's static `HintRule` on a
 * leak — see `HintCards`. The effort-gated reveal flow (`revealSolution` →
 * `onRevealed`) is retained for the voice agent; the in-panel reveal button is
 * intentionally not rendered.
 *
 * Structure: `KojiPanel` owns the reveal callback + open/close lifecycle (it
 * stays mounted across open/close); the presentational `KojiSheet` mounts only
 * while open, so its enter animation re-arms each time.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import type { Step } from "../../../content/types";
import {
  revealSolution,
  type RevealAllowed,
  type ToolContext,
} from "../../../lib/ai/tools";
import { cn } from "../../../lib/cn";
import type { StepPhase } from "../step-view";
import { HintCards } from "./hint-cards";
import { KojiMascot } from "./koji-mascot";
import { VoiceControls } from "./voice-controls";

/** The Koji mascot waves on a fixed ~5s cadence. Module-level so the reference
 *  stays stable (won't re-arm KojiMascot's loop on re-render). */
const KOJI_WAVE = ["waveLeft", "waveRight"] as const;

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
   * engagement). Retained with the reveal flow; the tool re-checks this
   * source-of-truth side.
   */
  revealReady: boolean;
  /**
   * Monotonic token: bump it to auto-reveal the first hint (the host bumps it
   * after the learner's 2nd wrong attempt — PRD §4.1 "auto-offered after ≥2").
   */
  autoHintToken: number;
  /** Apply an unlocked reveal back into the lesson (fill the answer, mark revealed). */
  onRevealed: (result: RevealAllowed) => void;
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
  const resolved = phase === "correct" || phase === "revealed";

  // --- Effort-gated reveal (retained; the in-panel button is not rendered). ---
  // The voice agent reveals via the `revealSolution` tool + `ctx.onReveal`; this
  // callback keeps the panel's reveal path intact (guarded by a ref so it carries
  // no UI state). It's wired into `KojiSheet` but no button triggers it.
  const revealBusyRef = useRef(false);
  const requestReveal = useCallback(async () => {
    if (revealBusyRef.current || step.kind !== "problem") return;
    revealBusyRef.current = true;
    try {
      const res = await revealSolution.handler({}, ctx);
      if (res.allowed) onRevealed(res);
    } finally {
      revealBusyRef.current = false;
    }
  }, [step, ctx, onRevealed]);

  // Keep the sheet mounted while it plays its exit animation, then unmount on its
  // `onAnimationEnd`. Mounting is deferred to the next frame so the CSS enter
  // animation arms cleanly. `onClose` still fires the instant the learner
  // dismisses; this only defers the unmount by one exit animation.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (!mounted) return null;

  return (
    <KojiSheet
      open={open}
      onClosed={() => setMounted(false)}
      onClose={onClose}
      revealReady={revealReady}
      onReveal={() => void requestReveal()}
      voice={<VoiceControls ctx={ctx} />}
      hints={
        step.kind === "problem" && !resolved ? (
          <HintCards ctx={ctx} step={step} autoHintToken={autoHintToken} />
        ) : null
      }
    />
  );
}

interface KojiSheetProps {
  /** Drives the enter (true) / exit (false) animation via `data-state`. */
  open: boolean;
  /** Fired once the exit animation finishes, so `KojiPanel` can unmount it. */
  onClosed: () => void;
  onClose: () => void;
  /**
   * Reveal effort-gate state + trigger. Part of the props contract (the reveal
   * flow is retained for the voice agent); the in-panel reveal button is
   * intentionally not rendered, so these are not read here.
   */
  revealReady: boolean;
  onReveal: () => void;
  /** The voice + unified-chat surface. */
  voice: ReactNode;
  /** The hint flip-card surface (problems only), or null. */
  hints: ReactNode;
}

/**
 * The presentational bottom-sheet. Mounts only while open (so its enter
 * animation re-arms each time) and owns focus + Escape-to-close. `revealReady` /
 * `onReveal` are intentionally not destructured — the reveal flow is retained but
 * has no button.
 */
function KojiSheet({ open, onClosed, onClose, voice, hints }: KojiSheetProps) {
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
          "koji-sheet absolute inset-x-0 bottom-0 mx-auto flex max-h-[82svh] w-full max-w-lg flex-col rounded-t-3xl border border-border bg-background shadow-2xl shadow-black/40 outline-none",
          "transform-gpu will-change-transform",
          "sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm sm:rounded-3xl",
        )}
      >
        {/* Close (X) in the top corner. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Koji"
          className="absolute right-3 top-3 z-10 grid size-9 touch-manipulation place-items-center rounded-full text-muted outline-none transition-colors hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
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

        {/* Koji's Rive mascot, prominent + centered (enters + waves on a loop). */}
        <div className="flex shrink-0 justify-center pt-6 pb-1">
          <KojiMascot size="size-24" reactions={KOJI_WAVE} loopIntervalMs={5000} />
        </div>

        {voice}
        {hints}
      </div>
    </div>
  );
}
