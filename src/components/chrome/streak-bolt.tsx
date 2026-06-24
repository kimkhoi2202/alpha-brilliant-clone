import { cn } from "../../lib/cn";

export interface StreakBoltProps {
  /**
   * Active streak → filled bolt (Brilliant's "pear"); otherwise a hollow
   * outline (the at-risk / not-yet-done-today state).
   */
  completed?: boolean;
  className?: string;
}

/**
 * The top-bar streak bolt. Brilliant renders this as a plain inline SVG,
 * toggling fill/stroke on whether today is done.
 */
export function StreakBolt({ completed = false, className }: StreakBoltProps) {
  return (
    <svg
      viewBox="0 0 19 25"
      fill="none"
      aria-hidden
      className={cn("h-6 w-[18px] shrink-0", className)}
    >
      <path
        d="M1.27498 12.516L10.1761 1.31828C10.7098 0.646883 11.7966 1.11739 11.6606 1.96094L10.3758 9.92921H15.8888C16.9368 9.92921 17.5236 11.1248 16.8757 11.94L7.97457 23.1377C7.44087 23.8091 6.35401 23.3386 6.49003 22.495L7.7748 14.5268H2.26186C1.21381 14.5268 0.62701 13.3312 1.27498 12.516Z"
        fill={completed ? "var(--streak)" : "var(--nav-background)"}
        stroke={completed ? "none" : "var(--muted)"}
        strokeWidth={completed ? 0 : 2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
