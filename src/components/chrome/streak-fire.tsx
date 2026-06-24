import { cn } from "../../lib/cn";
import { DUOLINGO_FIRE_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

export interface StreakFireProps {
  className?: string;
}

/**
 * The animated streak flame: a self-contained Rive loop, no number. Heads up:
 * this asset has an opaque #313131 background baked into its artboard, so it only
 * sits flush on a surface painted that same color (the nav bar, see
 * `--nav-background`). Decorative on its own; give the surrounding control an
 * `aria-label` with the streak for screen readers.
 */
export function StreakFire({ className }: StreakFireProps) {
  return (
    <RivePlayer
      src={DUOLINGO_FIRE_RIV}
      artboard="Artboard"
      stateMachines="State Machine 1"
      className={cn("size-8 shrink-0", className)}
    />
  );
}
