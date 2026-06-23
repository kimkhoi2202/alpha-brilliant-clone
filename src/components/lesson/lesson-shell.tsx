import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { LessonTopBar } from "../chrome";

export interface LessonShellProps {
  /** 0–100 progress. */
  progress: number;
  onClose?: () => void;
  /** Trailing stat in the top bar (e.g. an energy <Counter />). */
  energy?: ReactNode;
  checkpoints?: number;
  /** Lesson content (prompt + figure / choices). */
  children: ReactNode;
  /** Bottom bar: a <FooterCtaBar> (Check) or a <FeedbackBar>. */
  footer: ReactNode;
  className?: string;
}

/** Full lesson player frame: top bar + centered content column + bottom bar. */
export function LessonShell({
  progress,
  onClose,
  energy,
  checkpoints,
  children,
  footer,
  className,
}: LessonShellProps) {
  return (
    <div className={cn("flex min-h-svh flex-col bg-background", className)}>
      <LessonTopBar
        progress={progress}
        onClose={onClose}
        endContent={energy}
        checkpoints={checkpoints}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8">
        {children}
      </main>
      {footer}
    </div>
  );
}
