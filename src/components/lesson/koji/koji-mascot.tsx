import { useCallback, useEffect, useRef } from "react";
import type { Rive } from "@rive-app/react-webgl2";

import { cn } from "../../../lib/cn";
import { ASK_KOJI_RIV } from "../../../lib/rive-runtime";
import { RivePlayer } from "../../visuals";

export interface KojiMascotProps {
  /**
   * Tailwind size utility for the mascot box (e.g. `"size-40"`, `"size-64"`).
   * Defaults to `size-40`.
   */
  size?: string;
  /** Extra classes on the wrapper, for placement (margins, alignment, …). */
  className?: string;
  /**
   * Keep Koji alive with a gentle loop of expressive reactions. Defaults to
   * `true`. Forced off when the user prefers reduced motion.
   */
  loop?: boolean;
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
 * A reusable, animated Koji mascot.
 *
 * Reuses the same `ask_koji.riv` / `AskKoji` state machine as the in-lesson
 * mascot ({@link AskKoji}), but renders inline/centered instead of pinned to a
 * lesson corner, so marketing/landing surfaces can drop Koji in anywhere.
 *
 * The default `AskKoji` machine only draws the static "< >" frame — the
 * character doesn't show until an entrance trigger fires. So once the instance
 * loads (`onRive`) we capture it and fire `playEnter`, swooping Koji in, then
 * keep him expressive by firing a random reaction every ~4–6s.
 *
 * Reduced motion: we fire `idle` once (Koji is present and visible, just calm)
 * and never start the loop.
 */
export function KojiMascot({
  size = "size-40",
  className,
  loop = true,
}: KojiMascotProps) {
  const riveRef = useRef<Rive | null>(null);
  // Captured once at mount; drives both the entrance choice and whether to loop.
  const reducedRef = useRef<boolean>(prefersReducedMotion());

  // Fire a ViewModel trigger on the live instance (no-op until Koji has loaded).
  const fire = useCallback((trigger: string) => {
    riveRef.current?.viewModelInstance?.trigger(trigger)?.trigger();
  }, []);

  const onRive = useCallback(
    (rive: Rive) => {
      riveRef.current = rive;
      // Bring Koji on screen: swoop him in, or just settle into idle under
      // reduced motion. Without this the canvas only ever shows "< >".
      fire(reducedRef.current ? "idle" : "playEnter");
    },
    [fire],
  );

  // Keep Koji expressive: cycle random reactions on a gentle loop. Skipped when
  // looping is off or the user prefers reduced motion.
  useEffect(() => {
    if (!loop || reducedRef.current) return;
    const periodMs = LOOP_MIN_MS + Math.random() * (LOOP_MAX_MS - LOOP_MIN_MS);
    const id = window.setInterval(() => {
      fire(pick(LOOP_REACTIONS));
    }, periodMs);
    return () => window.clearInterval(id);
  }, [loop, fire]);

  return (
    <div
      className={cn("inline-flex items-center justify-center", size, className)}
      aria-hidden
    >
      <RivePlayer
        src={ASK_KOJI_RIV}
        stateMachines="AskKoji"
        autoBind
        viewModelBooleans={{ bracketsOn: true }}
        onRive={onRive}
        className="size-full"
      />
    </div>
  );
}
