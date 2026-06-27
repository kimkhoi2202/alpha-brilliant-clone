import { useCallback, useEffect, useRef } from "react";
import type { Rive } from "@rive-app/react-webgl2";

import { cn } from "../../../lib/cn";
import { ASK_KOJI_RIV } from "../../../lib/rive-runtime";
import { RivePlayer } from "../../visuals";

/**
 * A one-shot signal to fire a reaction on the mascot imperatively from a parent:
 * set `name` to a Rive trigger (e.g. `"successMedium"`, `"incorrect"`), stamp `ts`
 * with the issue time, and bump `nonce` to fire it. The `nonce` dedupes within a
 * mounted instance (so an effect re-run / StrictMode double-invoke can't
 * double-fire the same reaction), while `ts` gates the FIRST fire after (re)mount:
 * a RECENT reaction plays — so the first wrong answer that auto-opens the panel
 * still reacts — but a long-past one never replays when the panel is merely
 * re-opened later. See {@link REACTION_FRESH_MS}.
 */
export interface MascotReactionSignal {
  /** Rive trigger name to fire on the live instance. */
  name: string;
  /** Bumped per request so a repeated reaction still re-fires. */
  nonce: number;
  /** Wall-clock time (ms, `Date.now()`) the reaction was issued — see above. */
  ts: number;
}

export interface KojiMascotProps {
  /**
   * Tailwind size utility for the mascot box (e.g. `"size-40"`, `"size-64"`).
   * Defaults to `size-40`.
   */
  size?: string;
  /** Extra classes on the wrapper, for placement (margins, alignment, …). */
  className?: string;
  /**
   * Keep Koji alive with a gentle loop of expressive reactions after he enters.
   * Defaults to `true`. Forced off when the user prefers reduced motion.
   */
  loop?: boolean;
  /**
   * The expressive reactions cycled on the alive loop. Defaults to a mixed set
   * (successes + waves). Pass a focused set — e.g. just waves — to theme it.
   * Pass a stable (module-level) array to avoid re-creating the loop.
   */
  reactions?: readonly string[];
  /**
   * Fixed interval (ms) between looped reactions. Defaults to a gentle,
   * slightly randomized ~4–6s cadence.
   */
  loopIntervalMs?: number;
  /**
   * Imperative outcome reaction: when its `nonce` changes the mascot fires `name`
   * via the same trigger path the idle loop uses, so a parent can drive
   * success/miss reactions without disturbing the entrance or the idle loop. A
   * reaction still pending at (re)mount fires only if it's recent (so the
   * first-wrong auto-open reacts; a stale one on a later re-open doesn't). Optional.
   */
  reactionSignal?: MascotReactionSignal;
}

/**
 * Expressive reactions cycled while Koji idles, so visitors get a feel for how
 * lively the mascot is. A subset of the lesson reactions that read well out of
 * context (no "you got it wrong" beats).
 */
const LOOP_REACTIONS = [
  "successSmall",
  "successMedium",
  "waveLeft",
  "waveRight",
] as const;

/** Gentle, slightly randomized cadence for the alive loop (~4–6s). */
const LOOP_MIN_MS = 4000;
const LOOP_MAX_MS = 6000;

/**
 * How recent a {@link MascotReactionSignal} may be to still fire on the mascot's
 * (re)mount. Long enough to cover the first-wrong auto-open (the panel + mascot
 * mount a frame or two after the grade), short enough that re-opening the panel
 * later never replays a stale reaction.
 */
const REACTION_FRESH_MS = 1500;

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * A reusable, animated Koji mascot — the lesson `ask_koji.riv` / `AskKoji`
 * machine rendered inline, so any surface can drop Koji in.
 *
 * Mirrors the *dormant in-lesson* Koji (see {@link AskKoji}), NOT the tappable
 * "Ask Koji" button:
 *  - `bracketsOn: false` — no "< >" frame. Those brackets are the button
 *    affordance ("tap me"); a marketing mascot is just Koji himself.
 *  - Koji swoops in (`playEnter`) the first time he SCROLLS INTO VIEW (via an
 *    IntersectionObserver), so the entrance lands exactly when the visitor sees
 *    him rather than firing off-screen on mount. After entering he stays
 *    expressive on a gentle ~4–6s reaction loop.
 *
 * The `AskKoji` machine draws nothing until a trigger fires, so under reduced
 * motion we fire `idle` once on load (Koji present + visible, just calm) and
 * never observe or loop.
 */
export function KojiMascot({
  size = "size-40",
  className,
  loop = true,
  reactions = LOOP_REACTIONS,
  loopIntervalMs,
  reactionSignal,
}: KojiMascotProps) {
  const riveRef = useRef<Rive | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedRef = useRef<boolean>(prefersReducedMotion());
  const enteredRef = useRef(false);
  const inViewRef = useRef(false);
  const loopIdRef = useRef<number | null>(null);
  // The last reaction nonce this mounted instance has already handled. Starts null
  // (NOT the mount-time nonce) so a still-pending reaction at mount is eligible —
  // it's then gated on freshness below — instead of being silently absorbed.
  const lastReactionNonceRef = useRef<number | null>(null);

  // Fire a ViewModel trigger on the live instance (no-op until Koji has loaded).
  const fire = useCallback((trigger: string) => {
    riveRef.current?.viewModelInstance?.trigger(trigger)?.trigger();
  }, []);

  const startLoop = useCallback(() => {
    if (!loop || reducedRef.current || loopIdRef.current !== null) return;
    if (reactions.length === 0) return;
    const period =
      loopIntervalMs ?? LOOP_MIN_MS + Math.random() * (LOOP_MAX_MS - LOOP_MIN_MS);
    loopIdRef.current = window.setInterval(() => fire(pick(reactions)), period);
  }, [loop, fire, reactions, loopIntervalMs]);

  // Swoop Koji in exactly once — only when he's BOTH loaded and in view.
  const tryEnter = useCallback(() => {
    if (enteredRef.current || reducedRef.current) return;
    if (!riveRef.current || !inViewRef.current) return;
    enteredRef.current = true;
    fire("playEnter");
    startLoop();
  }, [fire, startLoop]);

  const onRive = useCallback(
    (rive: Rive) => {
      riveRef.current = rive;
      if (reducedRef.current) {
        // Present + visible, no motion (the machine shows nothing untriggered).
        fire("idle");
        return;
      }
      // Enters now if already in view; otherwise the observer will trigger it.
      tryEnter();
    },
    [fire, tryEnter],
  );

  // Reveal-on-scroll: fire the entrance the first time Koji enters the viewport.
  useEffect(() => {
    if (reducedRef.current) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // No observer available: enter as soon as Koji has loaded.
      inViewRef.current = true;
      tryEnter();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          inViewRef.current = true;
          tryEnter();
          if (enteredRef.current) observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tryEnter]);

  // Imperative outcome reactions (success / miss), driven by the parent via
  // `reactionSignal`. Fire `name` for each nonce we haven't handled yet. The
  // nonce-dedupe makes this idempotent within a mounted instance, so an effect
  // re-run / StrictMode double-invoke can't double-fire. We mark the nonce handled
  // BEFORE the freshness check so a stale reaction is skipped permanently (never
  // fired later either). On (re)mount the ref is null, so a still-pending reaction
  // is eligible — but only fires if it's RECENT: this lets the FIRST wrong answer
  // react as the panel auto-opens (it mounts the mascot a frame or two after the
  // grade) while never replaying a stale reaction when the panel is merely
  // re-opened later. `fire()` is a no-op until Koji has loaded; the entrance + idle
  // loop are untouched.
  useEffect(() => {
    if (!reactionSignal) return;
    if (lastReactionNonceRef.current === reactionSignal.nonce) return;
    lastReactionNonceRef.current = reactionSignal.nonce;
    if (Date.now() - reactionSignal.ts < REACTION_FRESH_MS) {
      fire(reactionSignal.name);
    }
  }, [reactionSignal, fire]);

  // Stop the reaction loop on unmount.
  useEffect(
    () => () => {
      if (loopIdRef.current !== null) window.clearInterval(loopIdRef.current);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className={cn("inline-flex items-center justify-center", size, className)}
      aria-hidden
    >
      <RivePlayer
        src={ASK_KOJI_RIV}
        stateMachines="AskKoji"
        autoBind
        viewModelBooleans={{ bracketsOn: false }}
        onRive={onRive}
        className="size-full"
      />
    </div>
  );
}
