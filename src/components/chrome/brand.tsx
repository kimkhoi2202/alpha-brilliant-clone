import { cn } from "../../lib/cn";

export interface BrandProps {
  /** Show only the mark, hide the wordmark. */
  markOnly?: boolean;
  /** The logo is the home affordance; wire this to navigation. */
  onPress?: () => void;
  className?: string;
}

/** AlphaBrilliant wordmark + mark — a clickable home link (placeholder art). */
export function Brand({ markOnly = false, onPress, className }: BrandProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label="AlphaBrilliant home"
      className={cn(
        "inline-flex select-none items-center gap-2 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <img src="/favicon.svg" alt="" aria-hidden className="size-7" />
      {!markOnly ? (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          AlphaBrilliant
        </span>
      ) : null}
    </button>
  );
}
