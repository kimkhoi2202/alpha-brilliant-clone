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
 * we use `Contain` — `Cover` scales it up to fill a wide screen and the pieces
 * balloon and spill off the top. Contain keeps the whole burst on-screen at the
 * intended size (a centered confetti column).
 */
export function ConfettiBurst({ className }: ConfettiBurstProps) {
  return (
    <RivePlayer
      src={CONFETTI_RIV}
      stateMachines="State Machine 1"
      fit={Fit.Contain}
      className={cn("pointer-events-none", className)}
    />
  );
}
