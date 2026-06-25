import { cn } from "../../lib/cn";

const FILL = {
  default: "bg-accent",
  correct: "bg-success",
  incorrect: "bg-danger",
} as const;

export interface RegionShadeQuestionProps {
  rows?: number;
  cols?: number;
  /** Indices of shaded cells (controlled). */
  shaded: number[];
  onToggle?: (index: number) => void;
  state?: keyof typeof FILL;
  /** Square size in px. */
  size?: number;
  className?: string;
}

/** Tap-to-shade region/partition question ("Color ½ of the shape"). */
export function RegionShadeQuestion({
  rows = 2,
  cols = 2,
  shaded,
  onToggle,
  state = "default",
  size = 192,
  className,
}: RegionShadeQuestionProps) {
  const total = rows * cols;
  const shadedSet = new Set(shaded);

  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-lg border-2 border-foreground",
        className,
      )}
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onToggle?.(i)}
          aria-pressed={shadedSet.has(i)}
          aria-label={`Region ${i + 1}`}
          className={cn(
            "border border-foreground/25 transition-colors",
            shadedSet.has(i) ? FILL[state] : "bg-transparent hover:bg-foreground/5",
          )}
        />
      ))}
    </div>
  );
}
