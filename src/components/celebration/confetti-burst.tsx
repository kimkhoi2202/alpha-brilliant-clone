import { Fit } from "@rive-app/react-webgl2";

import { cn } from "../../lib/cn";
import { CONFETTI_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

export interface ConfettiBurstProps {
  className?: string;
}

/**
 * Confetti for celebrations (autoplays). Render it as a `pointer-events-none`
 * layer behind the reward content. The artboard is tall/portrait (786×1704), so
 * we use `Contain`: `Cover` scales it up to fill a wide screen and the pieces
 * balloon and spill off the top. Contain keeps the whole burst on-screen at the
 * intended size (a centered confetti column).
 *
 * The Rive layer is rendered larger than its positioning box and centered on it,
 * so the `Contain`-fit artboard scales up uniformly: bigger, more prominent
 * particles and a wider, fuller spread around the reward. Overflow past the
 * celebration container is clipped by its `overflow-hidden`, so the burst stays
 * centered and nothing else on the screen shifts.
 */
export function ConfettiBurst({ className }: ConfettiBurstProps) {
  return (
    <div className={cn("pointer-events-none", className)}>
      <RivePlayer
        src={CONFETTI_RIV}
        stateMachines="State Machine 1"
        fit={Fit.Contain}
        className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
