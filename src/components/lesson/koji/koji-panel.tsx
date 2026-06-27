/**
 * The in-lesson Koji panel (PRD-phase-2 §4.1): the tappable tutor surface.
 *
 * Layout, top → bottom:
 *  1. Koji's Rive mascot (he animates + waves on a gentle loop), with a small
 *     close (X) in the corner. He's vertically centered in the panel body while
 *     the chat is empty and slides up to dock compactly at the top once the
 *     thread has content — driven by a `hasContent` signal lifted from the voice
 *     surface (he himself never scrolls).
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
import { motion, useReducedMotion } from "motion/react";

import type { Step } from "../../../content/types";
import type { ConversationSummary } from "../../../lib/ai/conversation-history";
import {
  revealSolution,
  type RevealAllowed,
  type ToolContext,
} from "../../../lib/ai/tools";
import type { KojiConversationApi } from "../../../lib/ai/use-koji-conversation";
import { cn } from "../../../lib/cn";
import { iconButtonClass } from "../../chrome/icon-button";
import type { StepPhase } from "../step-view";
import { HintCards } from "./hint-cards";
import { KojiHistoryDrawer } from "./koji-history-drawer";
import { KojiMascot, type MascotReactionSignal } from "./koji-mascot";
import { VoiceControls } from "./voice-controls";

/** The Koji mascot waves on a fixed ~5s cadence. Module-level so the reference
 *  stays stable (won't re-arm KojiMascot's loop on re-render). */
const KOJI_WAVE = ["waveLeft", "waveRight"] as const;

/** Shared easing token (Emil Kowalski blueprint), inlined for Motion. */
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

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
   * The hint UI is currently hidden, so this is dormant; proactive coaching now
   * rides on `coachPending` below instead.
   */
  autoHintToken: number;
  /**
   * Proactive-coaching trigger: flips true on the host's ≥2-wrong, once-per-step
   * auto-offer. Forwarded to the voice surface, which fires exactly one proactive
   * Koji coach turn into the realtime chat and then calls {@link onCoachHandled}.
   */
  coachPending: boolean;
  /** Clear the proactive-coach flag once the surface has fired the turn. */
  onCoachHandled: () => void;
  /** Apply an unlocked reveal back into the lesson (fill the answer, mark revealed). */
  onRevealed: (result: RevealAllowed) => void;
  /**
   * Lesson-scoped conversation store (one conversation per lesson, persisted to
   * Firestore). Owns the active conversation (current lesson or a resumed past
   * one), seeds + restores the transcript, and powers the history drawer.
   */
  conversation: KojiConversationApi;
  /**
   * Jump back to a specific already-reached step — forwarded to the chat thread
   * so clicking a recorded "answer" bubble returns the learner to that step.
   */
  onGoToStep?: (stepIndex: number) => void;
  /**
   * Outcome reaction signal forwarded to the in-panel Koji mascot: bump its
   * `nonce` to fire a success/miss reaction (mirrors the lesson mascot). The
   * mascot ignores it until the nonce changes after mount. Optional.
   */
  reactionSignal?: MascotReactionSignal;
}

export function KojiPanel({
  open,
  onClose,
  ctx,
  step,
  phase,
  revealReady,
  autoHintToken,
  coachPending,
  onCoachHandled,
  onRevealed,
  conversation,
  onGoToStep,
  reactionSignal,
}: KojiPanelProps) {
  const resolved = phase === "correct" || phase === "revealed";
  const active = conversation.active;

  // Does the active conversation's thread have visible content? Lifted from
  // `VoiceControls` (effect-driven, via `onContentPresent`) so the sheet can
  // center Koji while the chat is empty and dock him to the top once it has
  // turns. Defaults false, so a fresh or still-loading panel opens with Koji
  // centered; it tracks the conversation across open/close + "new chat" (the
  // surface re-reports on mount), so it's already correct on reopen.
  const [hasContent, setHasContent] = useState(false);

  // Flush any pending (debounced) save before dismissing, so closing + reopening
  // the panel in the same lesson always shows the same conversation.
  const closeAndSave = useCallback(() => {
    conversation.flush();
    onClose();
  }, [conversation, onClose]);

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
      onClose={closeAndSave}
      hasContent={hasContent}
      reactionSignal={reactionSignal}
      revealReady={revealReady}
      onReveal={() => void requestReveal()}
      activeConversationId={active.conversationId}
      viewingPast={conversation.viewingPast}
      viewingTitle={active.lessonTitle}
      // New chat is meaningful unless the current conversation is already empty
      // (when viewing a past chat it still lets you return to a fresh current one).
      newChatDisabled={!conversation.viewingPast && active.messages.length === 0}
      onNewChat={conversation.startNewChat}
      onSelectPast={(summary: ConversationSummary) =>
        conversation.openPast(
          summary.conversationId,
          summary.lessonId,
          summary.lessonTitle,
        )
      }
      onBackToCurrent={conversation.backToCurrent}
      voice={
        active.loaded ? (
          // Keyed by conversation identity so switching conversations (or a
          // resume) remounts the surface with a fresh session seed.
          <VoiceControls
            key={active.key}
            ctx={ctx}
            initialMessages={active.messages}
            freeform={active.freeform}
            coachPending={coachPending}
            onCoachHandled={onCoachHandled}
            onContentPresent={setHasContent}
            onGoToStep={onGoToStep}
            onPersist={(messages) =>
              conversation.persist(
                active.conversationId,
                active.lessonId,
                active.lessonTitle,
                messages,
              )
            }
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted">
            Loading…
          </div>
        )
      }
      hints={
        // Hints follow the CURRENT step; suppressed while viewing a past
        // conversation (free-form, not tied to this step's problem).
        !conversation.viewingPast && step.kind === "problem" && !resolved ? (
          // Keyed by step so the hint tiers reset per problem now that the panel
          // itself persists across steps (it's no longer remounted per step).
          <HintCards key={step.id} ctx={ctx} step={step} autoHintToken={autoHintToken} />
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
   * Whether the conversation thread has visible content. Drives the body layout:
   * false → Koji centered (composer pinned at the bottom); true → Koji compact at
   * the top with the thread filling + scrolling beneath him.
   */
  hasContent: boolean;
  /** Outcome reaction signal forwarded to the mascot (success/miss reactions). */
  reactionSignal?: MascotReactionSignal;
  /**
   * Reveal effort-gate state + trigger. Part of the props contract (the reveal
   * flow is retained for the voice agent); the in-panel reveal button is
   * intentionally not rendered, so these are not read here.
   */
  revealReady: boolean;
  onReveal: () => void;
  /** Id of the active conversation (highlighted in the history list). */
  activeConversationId: string;
  /** Whether a past conversation (not the active current one) is being viewed. */
  viewingPast: boolean;
  /** Title of the active conversation (shown in the "viewing past" banner). */
  viewingTitle: string;
  /** Disable "new chat" when there's nothing to start fresh from. */
  newChatDisabled: boolean;
  /** Archive the current chat and start a fresh one for the current lesson. */
  onNewChat: () => void;
  /** Load a chosen past conversation into the panel. */
  onSelectPast: (summary: ConversationSummary) => void;
  /** Return to the current lesson's conversation. */
  onBackToCurrent: () => void;
  /** The voice + unified-chat surface. */
  voice: ReactNode;
  /** The hint flip-card surface (problems only), or null. */
  hints: ReactNode;
}

/**
 * The presentational bottom-sheet. Mounts only while open (so its enter
 * animation re-arms each time).
 *
 * It is NON-MODAL, mirroring the floating calculator: there is no backdrop/scrim
 * and no dialog/aria-modal. A full-viewport positioner is `pointer-events-none`
 * (clicks fall through to the lesson) and only the sheet re-enables
 * `pointer-events-auto`, so the rest of the lesson stays fully interactive while
 * Koji is open — and Koji + the calculator can be open at the same time. It reads
 * as a complementary `region` (named "Ask Koji"); it moves initial focus into the
 * sheet (non-trapping) and closes on Escape, but never traps focus or blocks the
 * page. The `data-lesson-koji` marker lets the lesson's Enter handler leave
 * keypresses that start inside the panel alone (just like the calculator's).
 *
 * `revealReady` / `onReveal` are intentionally not destructured — the reveal flow
 * is retained but has no button. It also hosts the history button + slide-in
 * drawer and the "viewing a past conversation" banner; the drawer's open state
 * lives here so it resets each time the panel reopens.
 */
function KojiSheet({
  open,
  onClosed,
  onClose,
  hasContent,
  reactionSignal,
  activeConversationId,
  viewingPast,
  viewingTitle,
  newChatDisabled,
  onNewChat,
  onSelectPast,
  onBackToCurrent,
  voice,
  hints,
}: KojiSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const reduce = useReducedMotion();
  // The empty↔content mascot morph (size + center↔top travel). Transform/flex
  // based (scale/y on the mascot, flexGrow on the regions) — deliberately NOT
  // Motion `layout`, which fought the new-chat remount and flung him off-screen.
  // Instant under reduced motion.
  const morph = reduce
    ? { duration: 0 }
    : { duration: 0.34, ease: EASE_OUT_CUBIC };

  // Move focus into the sheet ONLY when it opens (keyed on `open`, never on
  // `onClose`/`showHistory`). `onClose` is `closeAndSave`, whose identity churns
  // every time the conversation persists a turn; folding the focus call in with
  // the Escape listener made it re-fire on every persisted turn and yank focus
  // off the composer mid-typing. Keying focus to `open` alone fixes that.
  // Non-trapping (the panel is non-modal, so the lesson stays reachable);
  // `preventScroll` stops the page jumping to the bottom-anchored sheet.
  useEffect(() => {
    if (!open) return;
    sheetRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Escape closes the history drawer first, else the panel (so it doesn't dismiss
  // Koji out from under an open history list). Re-subscribing on identity churn is
  // harmless (no focus side effect), so this keeps its own deps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showHistory) setShowHistory(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showHistory]);

  return (
    // Non-blocking positioner: a layer that fills the lesson frame — it's mounted
    // INSIDE the bordered stage, so `absolute inset-0` lines the popup up with
    // that border (like the calculator) instead of floating against the viewport.
    // It is itself `pointer-events-none`, so clicks pass straight through to the
    // lesson behind it. There is NO backdrop/scrim and NO modal semantics — only
    // the sheet re-enables pointer events, keeping the lesson fully interactive
    // (pick a side, press Check) while Koji is open and letting Koji + the
    // calculator be open together. z-[60] sits just above the calculator panel
    // (z-50) so the two never fight when they overlap.
    <div className="pointer-events-none absolute inset-0 z-[60]">
      <div
        ref={sheetRef}
        tabIndex={-1}
        role="region"
        aria-label="Ask Koji"
        data-lesson-koji
        data-state={open ? "open" : "closed"}
        onAnimationEnd={(event) => {
          // Ignore child animations (message bubbles, etc.) bubbling up; only the
          // sheet's own exit animation unmounts it.
          if (event.target !== event.currentTarget) return;
          if (!open) onClosed();
        }}
        className={cn(
          // A min height (capped below max-h on short viewports) gives the empty
          // state room to vertically center Koji, and keeps the panel from
          // snapping shorter when the first message lands — it simply grows from
          // there as the thread fills, up to the max.
          "koji-sheet pointer-events-auto absolute inset-x-0 bottom-0 mx-auto flex max-h-[82svh] min-h-[min(82svh,22rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-background shadow-2xl shadow-black/40 outline-none",
          "transform-gpu will-change-transform",
          "sm:inset-x-auto sm:bottom-4 sm:left-4 sm:max-w-sm sm:rounded-3xl",
        )}
      >
        {/* Top-corner controls, left → right: New chat · History · Close (X),
            evenly spaced (~4px gaps between the 36px hit targets). */}
        <button
          type="button"
          onClick={onNewChat}
          disabled={newChatDisabled}
          aria-label="New chat"
          className={iconButtonClass({
            size: "size-9",
            className:
              "absolute right-[5.75rem] top-3 z-10 touch-manipulation disabled:pointer-events-none disabled:opacity-40",
          })}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-[1.15rem]">
            <path
              d="M11 4.5H6.5A2.5 2.5 0 0 0 4 7v10.5A2.5 2.5 0 0 0 6.5 20H17a2.5 2.5 0 0 0 2.5-2.5V13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.4 3.6a1.85 1.85 0 0 1 2.6 2.6l-8.5 8.5-3.3.7.7-3.3 8.5-8.5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setShowHistory(true)}
          aria-label="Conversation history"
          className={iconButtonClass({
            size: "size-9",
            className: "absolute right-[3.25rem] top-3 z-10 touch-manipulation",
          })}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-[1.15rem]">
            <path
              d="M12 8v4l2.5 2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.5 12a8.5 8.5 0 1 0 2.4-5.9M3.5 4v3.3h3.3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Koji"
          className={iconButtonClass({
            size: "size-9",
            className: "absolute right-3 top-3 z-10 touch-manipulation",
          })}
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

        {/* Koji's Rive mascot. Empty chat → BIG + vertically centered; with
            content → SMALL + docked at the top (the thread fills + scrolls below,
            he never scrolls away). The big↔small + center↔top change is a smooth
            morph: this wrapper animates `flexGrow` (its region grows to fill the
            body when empty, then collapses to the mascot's height when docked)
            and the inner mascot animates `scale` (size) + a small `y` (a downward
            nudge that offsets the composer's upward pull so "centered" reads as
            the panel's middle). Transform/flex-based, NOT Motion `layout` —
            layout projection fought the new-chat remount and flung him
            off-screen. He lives here (not in the voice surface) so he stays
            visible while the conversation loads / when voice is unsupported. */}
        <motion.div
          className="flex shrink-0 items-center justify-center overflow-hidden"
          style={{ flexBasis: "auto" }}
          animate={{ flexGrow: hasContent ? 0 : 1 }}
          transition={morph}
        >
          <motion.div
            className="inline-flex"
            style={{ willChange: "transform" }}
            animate={{ scale: hasContent ? 0.65 : 1, y: hasContent ? 0 : 32 }}
            transition={morph}
          >
            <KojiMascot
              size="size-32"
              reactions={KOJI_WAVE}
              loopIntervalMs={5000}
              reactionSignal={reactionSignal}
            />
          </motion.div>
        </motion.div>

        {/* Resuming a past conversation: show what's open + a way back. */}
        {viewingPast ? (
          <div className="mx-4 mb-1 flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-default px-3 py-2">
            <span className="min-w-0 text-xs text-muted">
              Resuming{" "}
              <span className="font-semibold text-foreground">{viewingTitle}</span>
            </span>
            <button
              type="button"
              onClick={onBackToCurrent}
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-accent outline-none transition-colors hover:bg-accent-soft/60 focus-visible:ring-2 focus-visible:ring-accent"
            >
              Back to lesson
            </button>
          </div>
        ) : null}

        {/* Voice/text surface. Its `flexGrow` animates as the complement of the
            mascot's: empty → 0 (just the composer at the bottom, so the mascot's
            region above takes the slack); populated → 1 (the inner thread grows +
            scrolls with the composer pinned at its bottom). Wrapping it here lets
            the panel own the flex role (VoiceControls' own section is always
            flex-1). Holds whatever `voice` is — the chat surface, the "Loading…"
            placeholder, or nothing when voice is unsupported. */}
        <motion.div
          className="flex min-h-0 flex-col"
          style={{ flexBasis: "auto" }}
          animate={{ flexGrow: hasContent ? 1 : 0 }}
          transition={morph}
        >
          {voice}
        </motion.div>
        {hints}

        {/* In-card slide-in history drawer (covers the chat surface). */}
        <KojiHistoryDrawer
          open={showHistory}
          activeConversationId={activeConversationId}
          onSelect={(summary) => {
            onSelectPast(summary);
            setShowHistory(false);
          }}
          onClose={() => setShowHistory(false)}
        />
      </div>
    </div>
  );
}
