/**
 * `HintCards` — progressive hint tiers as a click-to-advance flip card
 * (PRD-phase-2 §4.1 "progressive hints, no spoilers").
 *
 * The learner taps the card to reveal Hint 1, taps again for Hint 2, then Hint 3
 * (capped at three). Each tier flips in with Motion (the Pingo flip-card pattern,
 * but click-triggered, not swipe). The host's auto-offer token reveals the first
 * hint automatically after ≥2 wrong attempts.
 *
 * Each tier's text comes from the same grounded `giveHint` tool the voice agent
 * uses, then through the W1 client-side leak gate: a model hint that names the
 * answer is dropped for the hand-written static hint, so the learner is nudged
 * but never spoiled. Tiers are fetched lazily and cached, so opening the panel
 * costs no AI call until a hint is actually requested.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { ProblemStep } from "../../../content/types";
import {
  giveHint,
  staticHint,
  type HintLevel,
  type ToolContext,
} from "../../../lib/ai/tools";
import { hintLeaksAnswer } from "../../../lib/ai/verify";
import { cn } from "../../../lib/cn";
import { renderMathText } from "../../ui/math";

/** Hint tiers cap at three (tier 0 is the pre-hint invitation card). */
const MAX_TIER = 3;
/** Shared easing token (Emil Kowalski blueprint), inlined for Motion. */
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

export interface HintCardsProps {
  /** Live tool context (learner + step + grounding + engagement). */
  ctx: ToolContext;
  /** The current problem step (narrowed by the panel). */
  step: ProblemStep;
  /**
   * Monotonic token: bumping it auto-reveals the first hint (the host bumps it
   * after the learner's 2nd wrong attempt — PRD §4.1 "auto-offered after ≥2").
   */
  autoHintToken: number;
}

export function HintCards({ ctx, step, autoHintToken }: HintCardsProps) {
  // 0 = invitation; 1–3 = the hint tier on display.
  const [tier, setTier] = useState(0);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const reduce = useReducedMotion();

  const inFlightRef = useRef<Set<number>>(new Set());
  const loadedRef = useRef<Record<number, string>>({});
  const autoHandledRef = useRef(0);

  // Latest ctx/step without re-running the fetch effect (which keys on tier only,
  // so a ctx change mid-fetch can never cancel an in-flight hint).
  const ctxRef = useRef(ctx);
  const stepRef = useRef(step);
  useEffect(() => {
    ctxRef.current = ctx;
    stepRef.current = step;
  });

  // Auto-offer the first hint when the host bumps the token (≥2 wrong attempts).
  useEffect(() => {
    if (autoHintToken > 0 && autoHintToken !== autoHandledRef.current) {
      autoHandledRef.current = autoHintToken;
      setTier((t) => (t < 1 ? 1 : t));
    }
  }, [autoHintToken]);

  // Fetch the current tier once, lazily: grounded hint → W1 leak gate → static
  // fallback. Keyed on `tier` alone; ctx/step come from refs, so the in-flight
  // fetch is never interrupted by an unrelated context change. `advance` is
  // disabled while busy, so a tier never changes mid-fetch.
  useEffect(() => {
    if (tier < 1) return;
    const level = tier as HintLevel;
    if (loadedRef.current[level] !== undefined || inFlightRef.current.has(level)) {
      return;
    }
    inFlightRef.current.add(level);
    let cancelled = false;
    setBusy(true);
    void (async () => {
      const liveCtx = ctxRef.current;
      const problem = stepRef.current;
      let text = "";
      try {
        const res = await giveHint.handler({ level }, liveCtx);
        text = res.text ?? "";
        // A model hint that leaks the answer is dropped for the static fallback.
        // We bias to flagging — a false positive only costs a static hint, a
        // miss would spoil the answer.
        if (res.source === "ai" && text && hintLeaksAnswer(text, problem)) {
          text = staticHint(problem, liveCtx.step?.answer ?? null);
        }
        if (!text) text = staticHint(problem, liveCtx.step?.answer ?? null);
      } catch {
        text = staticHint(problem, liveCtx.step?.answer ?? null);
      } finally {
        inFlightRef.current.delete(level);
      }
      loadedRef.current[level] = text;
      if (!cancelled) {
        setHints((prev) => ({ ...prev, [level]: text }));
        setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  const advance = useCallback(() => {
    setTier((t) => (t >= MAX_TIER ? t : t + 1));
  }, []);

  const atLast = tier >= MAX_TIER;
  const canAdvance = !busy && !atLast;
  const loadingTier = tier >= 1 && hints[tier] === undefined;

  // The card body already shows "Thinking…" while a tier loads, so the affordance
  // stays quiet during a fetch to avoid duplicating it.
  const affordance = busy
    ? ""
    : atLast
      ? "That's the last hint — give it a go."
      : tier === 0
        ? "Tap for a hint"
        : "Tap for the next hint";

  const ariaLabel =
    tier === 0
      ? "Show a hint"
      : atLast
        ? `Hint ${tier} of ${MAX_TIER}. That's the last hint.`
        : `Hint ${tier} of ${MAX_TIER}. Tap to show the next hint.`;

  return (
    <section
      aria-label="Hints"
      className="shrink-0 border-t border-border px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]"
    >
      <button
        type="button"
        onClick={advance}
        disabled={!canAdvance}
        aria-label={ariaLabel}
        className={cn(
          "block w-full rounded-2xl border border-border bg-default/60 p-4 text-left outline-none",
          "transition-colors focus-visible:ring-2 focus-visible:ring-accent",
          canAdvance ? "cursor-pointer" : "cursor-default",
        )}
        style={{ perspective: 900 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tier}
            initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -90 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, rotateY: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: 90 }}
            transition={{ duration: reduce ? 0.12 : 0.28, ease: EASE_OUT_CUBIC }}
            style={{ transformOrigin: "center" }}
          >
            {tier === 0 ? (
              <>
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">
                  Hints
                </p>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  Stuck? Tap for a nudge — I&apos;ll start small and build up, no
                  spoilers.
                </p>
              </>
            ) : (
              <>
                <p className="text-[0.7rem] font-bold uppercase tracking-wider tabular-nums text-accent-soft-foreground">
                  Hint {tier} of {MAX_TIER}
                </p>
                <p
                  className="mt-1 min-h-[1.25rem] text-sm leading-relaxed text-foreground"
                  aria-live="polite"
                >
                  {loadingTier ? "Thinking…" : renderMathText(hints[tier] ?? "")}
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <p
          className={cn(
            "mt-3 text-xs font-medium",
            canAdvance ? "text-accent" : "text-muted",
          )}
        >
          {affordance}
          {canAdvance ? <span aria-hidden> →</span> : null}
        </p>
      </button>
    </section>
  );
}
