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
  /** Brilliant's success state: the frame edge greens and a soft green glow
   *  rises from the bottom. Only on a correct answer — never on wrong/reveal. */
  correct?: boolean;
  /** Small feedback toast (<FeedbackToast/>) shown bottom-left above the footer. */
  toast?: ReactNode;
  /** Lesson content (prompt + figure / choices). */
  children: ReactNode;
  /** Bottom row inside the lesson frame: a <FooterCtaBar> (Check, Continue, etc.). */
  footer: ReactNode;
  className?: string;
}

/**
 * Full lesson player frame: top bar + bordered lesson stage.
 *
 * The bordered stage fills the available viewport area and owns both the lesson
 * content and the bottom action row, matching Brilliant's full-screen lesson
 * canvas.
 */
export function LessonShell({
  progress,
  onClose,
  energy,
  checkpoints,
  correct = false,
  toast,
  children,
  footer,
  className,
}: LessonShellProps) {
  return (
    <div
      className={cn(
        // Lock the player to the viewport so the frame/border is always the same
        // size and the page never scrolls — only the inner content area does
        // (so zoomed-in content adapts and scrolls within the frame).
        "relative flex h-svh flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <LessonTopBar
        progress={progress}
        onClose={onClose}
        endContent={energy}
        checkpoints={checkpoints}
      />
      <main className="flex min-h-0 flex-1 px-3 pb-3 pt-3 sm:px-6 sm:pb-6 md:px-10 md:pb-8 md:pt-4 xl:px-12">
        <div
          className={cn(
            "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border-2 transition-colors duration-300 sm:rounded-[28px]",
            correct
              ? "border-success"
              : "border-[color:var(--lesson-frame)]",
          )}
        >
          {/* Brilliant's success glow: a soft green wash rising from the bottom. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-500",
              correct ? "opacity-100" : "opacity-0",
            )}
            style={{
              background:
                "radial-gradient(ellipse at bottom, rgba(94,217,129,0.22), transparent 68%)",
            }}
          />
          {/* Scroll container: `m-auto` on the inner wrapper centers the content
              when it fits, but lets it scroll fully (no clipped top) when it
              overflows — e.g. zoomed in or on short viewports. */}
          <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-6 sm:py-8">
            <div className="m-auto w-full max-w-3xl">{children}</div>
          </div>
          {toast ? (
            <div className="pointer-events-none absolute bottom-24 left-4 z-50 lg:left-8">
              {toast}
            </div>
          ) : null}
          <div className="relative z-10 shrink-0">{footer}</div>
        </div>
      </main>
    </div>
  );
}
