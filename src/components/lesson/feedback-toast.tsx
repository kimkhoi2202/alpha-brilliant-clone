import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type FeedbackStatus = "correct" | "retryable" | "revealed";

const STATUS: Record<FeedbackStatus, { className: string; label: string }> = {
  correct: {
    className: "bg-success text-success-foreground",
    label: "That's it!",
  },
  retryable: {
    className: "bg-warning text-warning-foreground",
    label: "That's incorrect.",
  },
  revealed: {
    className: "bg-default text-foreground",
    label: "Here's the answer",
  },
};

export interface FeedbackToastProps {
  status: FeedbackStatus;
  /** Defaults to a status-appropriate message. */
  children?: ReactNode;
  className?: string;
}

/** Small feedback pill shown near the mascot after grading (Brilliant dark). */
export function FeedbackToast({ status, children, className }: FeedbackToastProps) {
  const s = STATUS[status];
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-lg shadow-black/30",
        s.className,
        className,
      )}
    >
      {children ?? s.label}
    </div>
  );
}
