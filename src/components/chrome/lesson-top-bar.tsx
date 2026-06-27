import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { ProgressBar } from "../ui/progress-bar";
import { iconButtonClass } from "./icon-button";

export interface LessonTopBarProps {
  /** 0–100 progress through the lesson. */
  progress: number;
  onClose?: () => void;
  /** Trailing content, e.g. an energy <Counter />. */
  endContent?: ReactNode;
  /** Trailing checkpoint dots (Brilliant shows upcoming sections). */
  checkpoints?: number;
  /**
   * Step back to review an already-completed step. Optional: when omitted (e.g.
   * the quiz), the back/forward chevrons don't render at all.
   */
  onBack?: () => void;
  /**
   * Step forward through already-reached steps. Forward is gated by the runner so
   * it can never move past the furthest step the learner has actually reached.
   */
  onForward?: () => void;
  /** Whether an earlier step exists to go back to (drives the back chevron). */
  canGoBack?: boolean;
  /** Whether an already-reached forward step exists (drives the forward chevron). */
  canGoForward?: boolean;
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

function ChevronLeftIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M27 33L18 24L27 15" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M21 33L30 24L21 15" />
    </svg>
  );
}

/**
 * A step-nav chevron, using the shared icon-button treatment (matches the
 * close button exactly): at rest just the icon (`text-muted`); on hover a
 * static `rounded-xl` square fills with `bg-default` and the icon brightens to
 * the foreground. Disabled renders a real `<button disabled>` — dimmed, no
 * hover, not focusable or clickable — so it can't be used to skip ahead.
 */
function StepNavButton({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-label={label}
      className={iconButtonClass({ size: "size-10", disabled })}
    >
      {children}
    </button>
  );
}

/** The slim lesson header: exit button, progress, optional checkpoints + stat. */
export function LessonTopBar({
  progress,
  onClose,
  endContent,
  checkpoints = 0,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false,
  className,
}: LessonTopBarProps) {
  // Only show the step chevrons when a caller wires up navigation (the lesson
  // runner). The quiz / other callers pass nothing, so they keep the bare bar.
  const showNav = Boolean(onBack || onForward);
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
          // The visual standard, matching the dialog/modal close button: at rest
          // just the icon; on hover HeroUI's .close-button shape — a static
          // rounded-xl (12px) square filled with bg-default — fills in behind it
          // and the icon brightens to the foreground (transition-colors).
          className={iconButtonClass({
            size: "size-10",
            className:
              "absolute left-4 top-1/2 -translate-y-1/2 sm:left-8 lg:left-16 xl:left-20",
          })}
        >
          <CloseIcon />
        </button>
        <div className="mx-auto flex h-full w-[min(52rem,calc(100%-8rem))] items-center gap-4 sm:w-[min(54rem,calc(100%-14rem))]">
          {showNav ? (
            <div className="flex shrink-0 items-center gap-1">
              <StepNavButton
                label="Previous step"
                disabled={!onBack || !canGoBack}
                onPress={onBack}
              >
                <ChevronLeftIcon />
              </StepNavButton>
              <StepNavButton
                label="Next step"
                disabled={!onForward || !canGoForward}
                onPress={onForward}
              >
                <ChevronRightIcon />
              </StepNavButton>
            </div>
          ) : null}
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
