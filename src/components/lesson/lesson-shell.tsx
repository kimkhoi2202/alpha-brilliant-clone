import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { LessonTopBar } from "../chrome";
import { LessonContainer, type LessonEvaluation } from "./lesson-container";

export interface LessonShellProps {
  /** 0–100 progress. */
  progress: number;
  onClose?: () => void;
  /** Trailing stat in the top bar (e.g. an energy <Counter />). */
  energy?: ReactNode;
  checkpoints?: number;
  /** Grading state — colors the lesson container border + glow. */
  evaluation?: LessonEvaluation;
  /** Small feedback toast (<FeedbackToast/>) shown bottom-left above the footer. */
  toast?: ReactNode;
  /** Lesson content (prompt + figure / choices). */
  children: ReactNode;
  /** Bottom bar: a <FooterCtaBar> (Check, or colored feedback actions). */
  footer: ReactNode;
  className?: string;
}

/** Full lesson player frame: top bar + lesson container + bottom bar. */
export function LessonShell({
  progress,
  onClose,
  energy,
  checkpoints,
  evaluation,
  toast,
  children,
  footer,
  className,
}: LessonShellProps) {
  return (
    <div className={cn("relative flex min-h-svh flex-col bg-background", className)}>
      <LessonTopBar
        progress={progress}
        onClose={onClose}
        endContent={energy}
        checkpoints={checkpoints}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <LessonContainer evaluation={evaluation} className="flex-1">
          {children}
        </LessonContainer>
      </main>
      {toast ? (
        <div className="pointer-events-none absolute bottom-24 left-4 z-50 lg:left-8">
          {toast}
        </div>
      ) : null}
      {footer}
    </div>
  );
}
