import { cn } from "../../lib/cn";

/**
 * Material "whatshot" flame, split into body + core so the inner flame can take
 * a brighter tone. Exported so the streak day-discs can reuse the same outline.
 */
export const FLAME_BODY_PATH =
  "M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z";
export const FLAME_CORE_PATH =
  "M11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z";

export interface StreakFlameProps {
  className?: string;
}

/**
 * The static two-tone fire icon: Brilliant's streak indicator (it replaces the
 * lightning bolt). Pair it with a separate number, Brilliant-style. Decorative
 * on its own; give the surrounding control an `aria-label` with the streak.
 */
export function StreakFlame({ className }: StreakFlameProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("size-6 shrink-0", className)}
    >
      <path d={FLAME_BODY_PATH} fill="var(--streak-flame)" />
      <path d={FLAME_CORE_PATH} fill="var(--streak-flame-core)" />
    </svg>
  );
}
