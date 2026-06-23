import { cn } from "../../lib/cn";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/** Hairline separator using Brilliant's separator token. */
export function Divider({
  orientation = "horizontal",
  className,
}: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-separator",
        orientation === "horizontal"
          ? "h-px w-full"
          : "min-h-full w-px self-stretch",
        className,
      )}
    />
  );
}
