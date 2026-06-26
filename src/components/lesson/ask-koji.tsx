import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { Rive } from "@rive-app/react-webgl2";

import { ASK_KOJI_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

/** Reactions the lesson can fire on Koji via a shared ref. */
export interface KojiHandle {
  /** Random success celebration (first-try correct). */
  success(): void;
  /** Sympathetic bounce on a wrong attempt. */
  incorrect(): void;
  /** Reassuring beat when the learner gets it right after a miss. */
  correctAfterIncorrect(): void;
  /**
   * Goodbye wave at the very end of the path. Optional `onDone` still fires once
   * the wave animation has finished (the machine returns to idle), but callers
   * now typically fire-and-forget so the wave plays without gating what's next.
   */
  wave(onDone?: () => void): void;
}

export interface AskKojiProps {
  /**
   * Swoop in (`playEnter`) vs. just appear (`idle`). True only when the lesson
   * was launched from the map (the branded transition just played), so Koji
   * doesn't re-run his entrance on every subsequent lesson or refresh.
   */
  swoop?: boolean;
  /** The mascot publishes its imperative reactions here for the runner to call. */
  handleRef?: RefObject<KojiHandle | null>;
  /**
   * Light Koji up as a tappable "Ask Koji" entry point (Phase 2, AI on). When
   * false — the default, and the only behavior with AI off — Koji is the dormant
   * Phase 1 decoration: brackets hidden, `pointer-events-none`, `aria-hidden`,
   * byte-for-byte unchanged. Gate this on `aiEnabled()` at the call site.
   */
  interactive?: boolean;
  /** Tapped the "Ask Koji" affordance (only meaningful when `interactive`). */
  onAsk?: () => void;
}

const SUCCESS = [
  "successSmall",
  "successMedium",
  "successBigOne",
  "successBigTwo",
] as const;
const WAVES = ["waveLeft", "waveRight", "waveLeftDown", "waveRightDown"] as const;

/**
 * A wave timeline runs ~1.5s. We hold the goodbye gate for this long so the wave
 * is clearly seen before advancing. (A fixed duration is more reliable than
 * watching for a state-machine event, which varies across Rive renderers.)
 */
const WAVE_VISIBLE_MS = 1800;

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

/**
 * Brilliant's in-lesson mascot (Koji), pinned to the bottom-left of the lesson
 * stage.
 *
 * The `AskKoji` state machine is driven by the `AskKojiVM` view model: we bind
 * it, set `bracketsOn = false` to hide the "Ask Koji" button brackets, then fire
 * view-model triggers: `playEnter`/`idle` to bring him on, and `successSmall…`,
 * `incorrect`, `correctAfterIncorrect`, `waveLeft…` as answer reactions.
 */
export function AskKoji({
  swoop = false,
  handleRef,
  interactive = false,
  onAsk,
}: AskKojiProps) {
  const riveRef = useRef<Rive | null>(null);
  // Capture the entrance choice once; `onRive` fires a single time on load.
  const swoopRef = useRef(swoop);
  const waveTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
    },
    [],
  );

  const fire = useCallback((trigger: string) => {
    riveRef.current?.viewModelInstance?.trigger(trigger)?.trigger();
  }, []);

  // Fire a goodbye wave, then resolve after the wave's run time so the caller can
  // wait before advancing. A fixed hold is used (rather than a state-machine
  // event) so it behaves identically across Rive renderers.
  const wave = useCallback((onDone?: () => void) => {
    const vm = riveRef.current?.viewModelInstance;
    if (!vm) {
      onDone?.();
      return;
    }
    vm.trigger(pick(WAVES))?.trigger();
    if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
    waveTimerRef.current = window.setTimeout(() => {
      waveTimerRef.current = null;
      onDone?.();
    }, WAVE_VISIBLE_MS);
  }, []);

  // Publish the reaction handle so the lesson runner can trigger Koji on grading.
  useEffect(() => {
    if (!handleRef) return;
    handleRef.current = {
      success: () => fire(pick(SUCCESS)),
      incorrect: () => fire("incorrect"),
      correctAfterIncorrect: () => fire("correctAfterIncorrect"),
      wave,
    };
    return () => {
      if (handleRef.current) handleRef.current = null;
    };
  }, [handleRef, fire, wave]);

  const onRive = useCallback(
    (rive: Rive) => {
      riveRef.current = rive;
      // `bracketsOn` is already set (via viewModelBooleans before this runs):
      // false for the dormant decoration, true for the interactive entry point.
      fire(swoopRef.current ? "playEnter" : "idle");
    },
    [fire],
  );

  // AI on: a tappable "Ask Koji" entry point. The "< >" brackets show (signaling
  // the affordance), pointer events are enabled, and a real button owns the tap +
  // accessible name. The canvas itself stays non-interactive so the tap always
  // lands on the button.
  if (interactive) {
    return (
      <div className="absolute bottom-1 left-1 z-40 lg:bottom-2 lg:left-2">
        <button
          type="button"
          onClick={onAsk}
          aria-label="Ask Koji for help"
          className="block touch-manipulation rounded-full outline-none transition-transform duration-150 ease-[var(--ease-out-cubic)] focus-visible:ring-2 focus-visible:ring-accent active:scale-95 [@media(hover:hover)]:hover:scale-105 motion-reduce:transition-none"
        >
          <RivePlayer
            src={ASK_KOJI_RIV}
            stateMachines="AskKoji"
            autoBind
            viewModelBooleans={{ bracketsOn: true }}
            onRive={onRive}
            className="pointer-events-none size-40"
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute bottom-1 left-1 z-40 lg:bottom-2 lg:left-2"
      aria-hidden
    >
      <RivePlayer
        src={ASK_KOJI_RIV}
        stateMachines="AskKoji"
        autoBind
        viewModelBooleans={{ bracketsOn: false }}
        onRive={onRive}
        className="size-40"
      />
    </div>
  );
}
