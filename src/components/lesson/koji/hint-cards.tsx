/**
 * `HintCards` — progressive hint tiers behind a single "Give me a Hint" button
 * (PRD-phase-2 §4.1 "progressive hints, no spoilers").
 *
 * The learner taps the button to reveal Hint 1, taps again ("Give me another
 * hint") for Hint 2, then Hint 3 (capped at three); after the last tier the
 * button gives way to a quiet "give it a go" line. The revealed hint renders as
 * plain (KaTeX-aware) text above the button, fading in with Motion. The host's
 * auto-offer token reveals the first hint automatically after ≥2 wrong attempts.
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
import { Button } from "../../ui/button";
import { renderMathText } from "../../ui/math";

/** Hint tiers cap at three (tier 0 = no hint revealed yet). */
const MAX_TIER = 3;
/** Shared easing token (Emil Kowalski blueprint), inlined for Motion. */
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

/**
 * Temporarily hidden per request: the whole hint UI (the "Give me a Hint" button,
 * the progressive tiers, and the auto-offer after wrong attempts) is off so
 * learners can't use hints for now. Flip to `true` to restore the feature.
 */
const HINTS_ENABLED = false;

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
  // 0 = no hint shown yet; 1–3 = the hint tier on display.
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
    if (
      HINTS_ENABLED &&
      autoHintToken > 0 &&
      autoHintToken !== autoHandledRef.current
    ) {
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
  const loadingTier = tier >= 1 && hints[tier] === undefined;

  const buttonLabel = tier === 0 ? "Give me a Hint" : "Give me another hint";
  const ariaLabel =
    tier === 0
      ? "Give me a hint"
      : `Hint ${tier} of ${MAX_TIER}. Show the next hint.`;

  return HINTS_ENABLED ? (
    <section
      aria-label="Hints"
      className="shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]"
    >
      {/* Revealed hint — plain (KaTeX-aware) text, fading in per tier. */}
      <AnimatePresence mode="wait" initial={false}>
        {tier >= 1 ? (
          <motion.div
            key={tier}
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.24, ease: EASE_OUT_CUBIC }}
            className="mb-3"
          >
            <p
              className="min-h-[1.25rem] text-sm leading-relaxed text-foreground"
              aria-live="polite"
            >
              {loadingTier ? "Thinking…" : renderMathText(hints[tier] ?? "")}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {atLast ? (
        // Last tier reached: drop the button. Stay quiet while it's still
        // loading (the text above shows "Thinking…"), then nudge them on.
        busy ? null : (
          <p className="text-xs font-medium text-muted">
            That&apos;s the last hint — give it a go.
          </p>
        )
      ) : (
        <Button
          variant="secondary"
          fullWidth
          isDisabled={busy}
          onPress={advance}
          aria-label={ariaLabel}
        >
          {buttonLabel}
        </Button>
      )}
    </section>
  ) : null;
}
