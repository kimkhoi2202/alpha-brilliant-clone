import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Fit, type Rive } from "@rive-app/react-webgl2";

import { cn } from "../../lib/cn";
import { GAMEBOARD_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

export type LessonNodeState = "active" | "available" | "locked" | "completed";

/**
 * Drive the gameboard node_all state machine. Two signals are independent, like
 * Brilliant: `select` is the highlight glow ring that follows the *selected*
 * node (moves as you click around), while `koji_appear` is the persistent green
 * "you are here" marker that stays on the current lesson (`state === "active"`).
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
  // Tracks whether this node currently shows the Koji "you are here" marker, so
  // it can be revealed on the active node and removed once the node is no longer
  // the current lesson — otherwise a stale marker lingers when the
  // recommendation moves and you end up with two markers.
  const kojiShown = useRef(false);

  const apply = useCallback(() => {
    const rive = riveRef.current;
    if (!rive) return;
    try {
      const inputs = rive.stateMachineInputs("node_all");
      const set = (name: string, value: number | boolean) => {
        const input = inputs.find((i) => i.name === name);
        if (input) input.value = value;
      };
      set("color", 1); // Blue — Brilliant's math course accent
      set("padlock", state === "locked");
      set("meter_locked", state === "locked");
      set("completed", state === "completed");
      set("select", selected); // glow ring follows UI selection
      set("hover", hovered); // Rive's own hover state, not a CSS lift
      // Reactive Koji marker: appear on the active node, and explicitly remove it
      // when this node stops being the current lesson, so exactly one node ever
      // carries the marker even as the recommendation moves.
      const fire = (name: string) =>
        inputs.find((i) => i.name === name)?.fire();
      if (state === "active" && !kojiShown.current) {
        fire("koji_appear");
        kojiShown.current = true;
      } else if (state !== "active" && kojiShown.current) {
        fire("koji_disappear");
        kojiShown.current = false;
      }
    } catch {
      /* state machine not ready yet — ignore */
    }
  }, [state, selected, hovered]);

  const handleRive = useCallback(
    (rive: Rive) => {
      riveRef.current = rive;
      apply();
    },
    [apply],
  );

  useEffect(() => {
    apply();
  }, [apply]);

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
