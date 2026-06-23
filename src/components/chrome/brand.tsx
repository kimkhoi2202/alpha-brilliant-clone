import { cn } from "../../lib/cn";

export interface BrandProps {
  /** Show only the mark, hide the wordmark. */
  markOnly?: boolean;
  className?: string;
}

/** AlphaBrilliant wordmark + mark (placeholder logo until real art lands). */
export function Brand({ markOnly = false, className }: BrandProps) {
  return (
    <span
      className={cn("inline-flex select-none items-center gap-2", className)}
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground"
      >
        △
      </span>
      {!markOnly ? (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          AlphaBrilliant
        </span>
      ) : null}
    </span>
  );
}
