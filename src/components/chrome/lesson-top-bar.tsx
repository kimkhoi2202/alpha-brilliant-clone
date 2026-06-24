import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { ProgressBar } from "../ui/progress-bar";

export interface LessonTopBarProps {
  /** 0–100 progress through the lesson. */
  progress: number;
  onClose?: () => void;
  /** Trailing content, e.g. an energy <Counter />. */
  endContent?: ReactNode;
  /** Trailing checkpoint dots (Brilliant shows upcoming sections). */
  checkpoints?: number;
  className?: string;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="size-5"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** The slim lesson header: exit button, progress, optional checkpoints + stat. */
export function LessonTopBar({
  progress,
  onClose,
  endContent,
  checkpoints = 0,
  className,
}: LessonTopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full bg-background",
        className,
      )}
    >
      <div className="relative h-20 w-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit lesson"
          // Resting: a circle (size-10 → 20px radius reads as a full circle, but
          // is a concrete value so border-radius can animate). On hover it morphs
          // into the dialog/modal close button's shape: HeroUI's .close-button
          // (rounded-xl = 12px) filled with bg-default. motion-reduce makes the
          // morph instant.
          className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-[20px] text-muted transition-[color,background-color,border-radius] duration-200 ease-out hover:rounded-xl hover:bg-default hover:text-foreground motion-reduce:transition-none sm:left-8 lg:left-16 xl:left-20"
        >
          <CloseIcon />
        </button>
        <div className="mx-auto flex h-full w-[min(52rem,calc(100%-8rem))] items-center gap-4 sm:w-[min(54rem,calc(100%-14rem))]">
          <ProgressBar
            value={progress}
            aria-label="Lesson progress"
            className="flex-1"
          />
          {checkpoints > 0 ? (
            <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
              {Array.from({ length: checkpoints }).map((_, i) => (
                <span key={i} className="size-1.5 rounded-full bg-default" />
              ))}
            </div>
          ) : null}
        </div>
        {endContent ? (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-8 lg:right-16 xl:right-20">
            {endContent}
          </div>
        ) : null}
      </div>
    </header>
  );
}
