import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Fit, type Rive } from "@rive-app/react-webgl2";

import { cn } from "../../lib/cn";
import { GAMEBOARD_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

export type LessonNodeState = "active" | "available" | "locked" | "completed";

// The node_all state machine has NO boolean for the Koji "you are here" marker —
// only fire triggers (koji_appear / koji_disappear). Firing those in rapid
// succession isn't reliable: an intermediate koji_disappear gets dropped when the
// machine is mid-transition, leaving a stale marker. That's exactly what Reset
// triggers — deleting the progress docs makes the recommendation (and thus which
// node is `active`) bounce through several lessons before it settles, so multiple
// nodes briefly fire koji_appear and several disappears are lost, leaving two or
// three "current" markers until a reload recreates the Rive instances.
//
// So we debounce the marker: a burst of `state` changes collapses to a single
// reconcile of the *settled* state, and we only ever fire on a real change. That
// guarantees exactly one node carries the marker, with at most one trigger per
// node per settle (never the rapid back-to-back fires the runtime drops).
const KOJI_SETTLE_MS = 120;

/**
 * Drive the gameboard node_all state machine. Two signals are independent, like
 * Brilliant: `select` is the highlight glow ring that follows the *selected*
 * node (moves as you click around), while the Koji marker is the persistent green
 * "you are here" badge that stays on the current lesson (`state === "active"`).
 * `color` is a palette index (Green 0, Blue 1, …); the math course is Blue = 1.
 */
function GameboardNode({
  state,
  selected,
  hovered,
}: {
  state: LessonNodeState;
  selected: boolean;
  hovered: boolean;
}) {
  const riveRef = useRef<Rive | null>(null);
  // Whether we've told this node's marker to show (i.e. the last trigger we
  // fired). We only ever fire on a genuine mismatch, so reconciliation is
  // idempotent and a node that nets out non-active never keeps a marker.
  const kojiShown = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idempotent inputs (booleans + palette index): safe to set on every render
  // since setting an input to its current value is a no-op. Applied immediately
  // so select / hover / completed / locked stay perfectly in step with props.
  const applyStatic = useCallback(() => {
    const rive = riveRef.current;
    if (!rive) return;
    try {
      const inputs = rive.stateMachineInputs("node_all");
      const set = (name: string, value: number | boolean) => {
        const input = inputs.find((i) => i.name === name);
        if (input) input.value = value;
      };
      set("color", 1); // Blue: Brilliant's math course accent
      set("padlock", state === "locked");
      set("meter_locked", state === "locked");
      set("completed", state === "completed");
      set("select", selected); // glow ring follows UI selection
      set("hover", hovered); // Rive's own hover state, not a CSS lift
    } catch {
      /* state machine not ready yet, ignore */
    }
  }, [state, selected, hovered]);

  // Bring the trigger-only Koji marker in line with `active`: fire at most one
  // trigger, and only when it actually needs to change. Run after a settle delay
  // (so a burst of `state` changes fires once, for the final state) and
  // immediately when a fresh Rive instance loads (a naturally settled moment).
  const reconcileKoji = useCallback(() => {
    const rive = riveRef.current;
    if (!rive) return;
    const want = state === "active";
    if (want === kojiShown.current) return;
    try {
      const inputs = rive.stateMachineInputs("node_all");
      inputs
        .find((i) => i.name === (want ? "koji_appear" : "koji_disappear"))
        ?.fire();
      kojiShown.current = want;
    } catch {
      /* state machine not ready yet, ignore */
    }
  }, [state]);

  const handleRive = useCallback(
    (rive: Rive) => {
      riveRef.current = rive;
      applyStatic();
      reconcileKoji();
    },
    [applyStatic, reconcileKoji],
  );

  // Static inputs track props immediately, every render.
  useEffect(() => {
    applyStatic();
  }, [applyStatic]);

  // Debounced marker reconcile: each `state` change cancels the pending reconcile
  // and reschedules, so only the settled state fires its trigger — never the
  // rapid back-to-back fires that leave stale duplicate markers after Reset.
  useEffect(() => {
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      reconcileKoji();
    }, KOJI_SETTLE_MS);
    return () => {
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    };
  }, [reconcileKoji]);

  return (
    <RivePlayer
      src={GAMEBOARD_RIV}
      artboard="Gameboard Node"
      stateMachines="node_all"
      fit={Fit.Contain}
      onRive={handleRive}
      // Canvas is click-through so the wrapping node button receives presses.
      className="size-full pointer-events-none"
    />
  );
}

export interface LessonNodeProps {
  label: string;
  state?: LessonNodeState;
  /** Whether this node is currently selected (drives the glow ring). */
  selected?: boolean;
  /** Reserved for parity with the previous API (Rive renders its own glyph). */
  icon?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** A single node on the course path: the Rive gameboard node + label. */
export function LessonNode({
  label,
  state = "locked",
  selected = false,
  onPress,
  className,
}: LessonNodeProps) {
  const locked = state === "locked";
  const active = state === "active";
  // Hover drives the gameboard's own `hover` state (set on the Rive node)
  // instead of nudging the whole asset up with a CSS transform.
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={locked}
      aria-current={active ? "step" : undefined}
      aria-pressed={selected}
      onMouseEnter={() => !locked && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => !locked && setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn(
        "flex items-center gap-4 text-left disabled:cursor-not-allowed",
        className,
      )}
    >
      <span className="relative block h-20 w-[88px] shrink-0">
        <GameboardNode state={state} selected={selected} hovered={hovered} />
      </span>
      {/* The gameboard artboard reserves headroom above the puck (for the Koji
          marker / hover pop), so the puck sits ~66% down its 80px box rather than
          centered. Nudge the label down to meet the puck's optical center. */}
      <span
        className={cn(
          "translate-y-[13px] text-base font-semibold leading-snug",
          active || selected
            ? "text-foreground"
            : locked
              ? "text-muted"
              : "text-foreground/90",
        )}
      >
        {label}
      </span>
    </button>
  );
}
