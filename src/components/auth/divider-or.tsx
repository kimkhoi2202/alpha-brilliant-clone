import { cn } from "../../lib/cn";

/** "OR" divider used between social and email auth. */
export function DividerOr({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-1 text-xs font-medium text-muted",
        className,
      )}
    >
      <span className="h-px flex-1 bg-separator" />
      OR
      <span className="h-px flex-1 bg-separator" />
    </div>
  );
}
