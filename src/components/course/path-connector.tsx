import { cn } from "../../lib/cn";

export interface PathConnectorProps {
  className?: string;
}

/** Vertical link between two course-map nodes (aligned under the medallion). */
export function PathConnector({ className }: PathConnectorProps) {
  return (
    <span
      aria-hidden
      className={cn("my-1 ml-7 block h-8 w-px bg-border", className)}
    />
  );
}
