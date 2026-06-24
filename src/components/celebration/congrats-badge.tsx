import { cn } from "../../lib/cn";
import { CONGRATULATIONS_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

export interface CongratsBadgeProps {
  className?: string;
}

/**
 * The gold "Congratulations" award badge (Rive). Fires the "Trigger explosion"
 * input once on load so the firework burst plays as the celebration appears.
 */
export function CongratsBadge({ className }: CongratsBadgeProps) {
  return (
    <RivePlayer
      src={CONGRATULATIONS_RIV}
      stateMachines="State Machine 1"
      onRive={(rive) => {
        try {
          const inputs = rive.stateMachineInputs("State Machine 1");
          inputs?.find((i) => i.name === "Trigger explosion")?.fire();
        } catch {
          /* state machine not ready */
        }
      }}
      className={cn("size-48", className)}
    />
  );
}
