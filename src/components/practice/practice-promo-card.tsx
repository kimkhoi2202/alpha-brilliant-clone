import { Button, Tooltip } from "../ui";

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
    <div className="rounded-2xl border-2 border-border bg-background p-6">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Infinite practice
        </p>
        <Tooltip
          content="Fresh, verified problems tuned to your level. Never run out."
          placement="top"
          delay={500}
          className="max-w-[260px]"
        >
          <button
            type="button"
            aria-label="About Infinite Practice"
            className="inline-flex items-center justify-center rounded-full p-0.5 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </Tooltip>
      </div>
      <Button
        variant="accent"
        size="lg"
        className="mt-4 w-full"
        onPress={onStart}
      >
        Practice
      </Button>
    </div>
  );
}
