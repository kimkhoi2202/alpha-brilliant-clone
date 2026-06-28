import { useEffect, useState } from "react";

import { cn } from "../../lib/cn";
import { useLearner } from "../../lib/learner";
import { Button, Tooltip } from "../ui";

export interface ReviewsCardProps {
  /** Start a spaced-review session (→ /reviews). */
  onStart: () => void;
  className?: string;
}

/** Coarse "due in …" forecast for the soonest upcoming review. */
function formatDueIn(ms: number): string {
  if (ms <= 0) return "now";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return minutes <= 1 ? "in a minute" : `in ${minutes} min`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 24) return hours === 1 ? "in 1 hour" : `in ${hours} hours`;
  const days = Math.round(ms / 86_400_000);
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/**
 * The home/course-map "Reviews due (N)" hub (Phase 3, SPOV 7): the spaced-
 * repetition entry point plus a due-soon forecast. Hidden until the learner has
 * skills scheduled (nothing to review yet on a brand-new account).
 */
export function ReviewsCard({ onStart, className }: ReviewsCardProps) {
  const { dueReviews, nextReviewAt } = useLearner();
  // A live "now" so the card reflects the current due state (and counts down)
  // instead of freezing at mount — otherwise a freshly-due review (the DEV
  // "make reviews due" control, or one that comes due while the map is open)
  // wouldn't surface until a navigation/remount.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const due = dueReviews(now).length;
  const next = nextReviewAt(now);

  // Nothing scheduled at all → don't show the card.
  if (due === 0 && next === null) return null;

  const hasDue = due > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-6",
        hasDue
          ? "border-warning/50 bg-warning/[0.06]"
          : "border-border bg-background",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Spaced review
        </p>
        <Tooltip
          content="Recall these before they fade. A skill counts as mastered once it survives a spaced review."
          placement="top"
          delay={500}
          className="max-w-[260px]"
        >
          <button
            type="button"
            aria-label="How spaced review works"
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

      {hasDue ? (
        <>
          <h3 className="mt-2.5 text-lg font-bold tracking-tight text-foreground">
            {due} review{due === 1 ? "" : "s"} due
          </h3>
          <Button
            variant="warning"
            size="lg"
            className="mt-4 w-full"
            onPress={onStart}
          >
            Start review
          </Button>
        </>
      ) : (
        <>
          <h3 className="mt-2.5 text-lg font-bold tracking-tight text-foreground">
            All caught up
          </h3>
          <p className="mt-1.5 text-sm leading-5 text-muted">
            {next !== null
              ? `Next review ${formatDueIn(next - now)}.`
              : "No reviews scheduled yet."}
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-4 w-full"
            onPress={onStart}
          >
            Review early
          </Button>
        </>
      )}
    </div>
  );
}
