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
        "sticky top-0 z-40 w-full border-b border-border bg-background",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Exit lesson"
          className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
        >
          <CloseIcon />
        </button>
        <ProgressBar
          value={progress}
          aria-label="Lesson progress"
          className="flex-1"
        />
        {checkpoints > 0 ? (
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: checkpoints }).map((_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-default" />
            ))}
          </div>
        ) : null}
        {endContent ? <div className="shrink-0">{endContent}</div> : null}
      </div>
    </header>
  );
}
