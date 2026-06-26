import { cn } from "../../lib/cn";
import { Button } from "../ui";

export interface PracticePromoCardProps {
  onStart: () => void;
}

/**
 * Course-map entry point into Infinite Practice. Shown only once the course's
 * `level-review` is complete and AI is on (the gating lives in the course map),
 * so practice is "reached after the level review" rather than a per-lesson button.
 */
export function PracticePromoCard({ onStart }: PracticePromoCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border-2 border-accent/40 bg-accent-soft/30 p-6",
        "transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out-cubic)]",
        "[@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-accent/60 [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-accent/20",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <PythagorasMotif />
      <div className="relative">
        <span className="inline-flex items-center rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent">
          New
        </span>
        <h3 className="mt-2.5 text-lg font-bold tracking-tight text-foreground">
          Infinite Practice
        </h3>
        <p className="mt-1.5 text-sm leading-5 text-muted">
          Fresh, verified problems tuned to your level.{" "}
          <span className="font-medium text-foreground">Never run out.</span>
        </p>
        <Button
          variant="accent"
          size="lg"
          className="mt-4 w-full"
          onPress={onStart}
        >
          Practice
        </Button>
      </div>
    </div>
  );
}

/**
 * A faint right triangle with its little squared corner — the course's
 * Pythagorean motif, echoing the course-card art. Purely decorative.
 */
function PythagorasMotif() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 80 80"
      className="pointer-events-none absolute -top-3 -right-2 size-24 select-none text-accent/20"
    >
      <path
        d="M14 66 H66 V14 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M14 54 H26 V66" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
