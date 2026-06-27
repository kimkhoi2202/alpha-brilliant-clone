import { cn } from "../../lib/cn";

export type StreakDayDiscState = "done" | "current" | "upcoming";

export interface StreakDayDiscProps {
  /**
   * - `done`: a lime `--streak` disc with a dark `--background` bolt (crisp).
   * - `current`: no fill, an `--accent` ring, and a visible lime bolt.
   * - `upcoming`: a faint ring with a muted bolt.
   */
  state: StreakDayDiscState;
  className?: string;
}

// Brilliant's "pear" bolt, drawn inside the 32×32 disc viewBox.
const BOLT_PATH =
  "M10.2903 16.2252L16.5654 8.24794C16.9417 7.76964 17.7079 8.10483 17.612 8.70578L16.7061 14.3834H20.5934C21.3322 14.3834 21.7459 15.2351 21.2891 15.8159L15.014 23.7931C14.6378 24.2714 13.8716 23.9362 13.9674 23.3353L14.8734 17.6577H10.9861C10.2472 17.6577 9.83354 16.8059 10.2903 16.2252Z";

/**
 * One day in a streak week: a lime disc + dark bolt when done, an accent ring +
 * visible bolt for the current day, or a faint ring + muted bolt when upcoming.
 * Shared between the in-app `StreakMenu` popover and the home `StreakCard`.
 */
export function StreakDayDisc({ state, className }: StreakDayDiscProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-10", className)} aria-hidden>
      {state === "done" ? (
        <rect width="32" height="32" rx="16" fill="var(--streak)" />
      ) : state === "current" ? (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="15"
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
        />
      ) : (
        <rect
          x="1"
          y="1"
          width="30"
          height="30"
          rx="15"
          fill="none"
          stroke="var(--foreground)"
          strokeOpacity={0.08}
          strokeWidth={1.5}
        />
      )}
      <path
        d={BOLT_PATH}
        fill={
          state === "done"
            ? "var(--background)"
            : state === "current"
              ? "var(--streak)"
              : "var(--bp-wa-400)"
        }
      />
    </svg>
  );
}
