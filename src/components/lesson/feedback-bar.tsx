import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type FeedbackStatus = "correct" | "retryable" | "revealed";

const STATUS: Record<
  FeedbackStatus,
  { bar: string; defaultTitle: string; icon: string }
> = {
  correct: {
    bar: "bg-feedback-correct text-feedback-correct-foreground",
    defaultTitle: "Correct!",
    icon: "🎉",
  },
  retryable: {
    bar: "bg-feedback-retryable text-feedback-retryable-foreground",
    defaultTitle: "Incorrect.",
    icon: "",
  },
  revealed: {
    bar: "bg-feedback-incorrect text-feedback-incorrect-foreground",
    defaultTitle: "Here's the answer",
    icon: "🔍",
  },
};

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

export interface FeedbackBarProps {
  status: FeedbackStatus;
  /** Defaults to a status-appropriate title. */
  title?: string;
  /** Shows "✦ +N XP" (correct answers). */
  xp?: number;
  onFlag?: () => void;
  /** Action buttons (Why? / Continue / Try again / See answer / Skip …). */
  children?: ReactNode;
  className?: string;
}

/** The colored feedback bar that replaces the Check bar after grading. */
export function FeedbackBar({
  status,
  title,
  xp,
  onFlag,
  children,
  className,
}: FeedbackBarProps) {
  const s = STATUS[status];
  return (
    <div className={cn("sticky bottom-0 z-40 w-full", s.bar, className)}>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-4">
        <div className="flex items-center gap-2 text-base font-bold">
          {s.icon ? <span aria-hidden>{s.icon}</span> : null}
          <span>{title ?? s.defaultTitle}</span>
          {xp != null ? (
            <span className="ml-1 text-sm font-semibold opacity-90">
              ✦ +{xp} XP
            </span>
          ) : null}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {children}
          {onFlag ? (
            <button
              type="button"
              onClick={onFlag}
              aria-label="Report a problem"
              className="grid size-8 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100"
            >
              <FlagIcon />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
