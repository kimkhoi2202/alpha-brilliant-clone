import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type FeedbackStatus = "correct" | "retryable" | "revealed";

/**
 * How the callout presents itself:
 * - `compact`: the cute speech-bubble pill that sits above Koji (short content).
 * - `roomy`: a wider, left-aligned banner for content larger than Koji, so long
 *   KaTeX feedback wraps across a few comfortable lines instead of a one-term
 *   per-line column.
 *
 * The lesson shell measures the rendered callout and hands the chosen layout
 * down; standalone use (e.g. the component showcase) defaults to `compact`.
 */
export type FeedbackToastLayout = "compact" | "roomy";

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
  /** Presentation; the shell sets this from its measurement (defaults compact). */
  layout?: FeedbackToastLayout;
}

/** Small feedback pill shown near the mascot after grading (Brilliant dark). */
export function FeedbackToast({
  status,
  children,
  className,
  layout = "compact",
}: FeedbackToastProps) {
  const roomy = layout === "roomy";
  const s = STATUS[status];
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl text-sm font-bold shadow-lg shadow-black/30",
        s.className,
        roomy
          ? // Roomy: block flow lets prose + inline KaTeX wrap naturally across a
            // few lines (left-aligned), capped so it never clips the prefix.
            "block w-fit max-w-md px-4 py-3 text-left leading-relaxed"
          : // Compact: the original single-line pill that hugs its short content.
            "inline-flex items-center gap-2 px-4 py-2",
        className,
      )}
    >
      {children ?? s.label}
    </div>
  );
}
