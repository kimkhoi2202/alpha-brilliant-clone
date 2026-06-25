import { cn } from "../../lib/cn";

export type ProgressIntent = "success" | "accent";
export type ProgressSize = "sm" | "md";

const FILL: Record<ProgressIntent, string> = {
  success: "bg-success",
  accent: "bg-accent",
};

const HEIGHT: Record<ProgressSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
};

export interface ProgressBarProps {
  /** Completion percentage, 0–100. */
  value: number;
  intent?: ProgressIntent;
  size?: ProgressSize;
  className?: string;
  "aria-label"?: string;
}

/** Thin determinate progress track (Brilliant's lesson / onboarding bar). */
export function ProgressBar({
  value,
  intent = "success",
  size = "md",
  className,
  "aria-label": ariaLabel,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-full bg-default",
        HEIGHT[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out",
          FILL[intent],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
