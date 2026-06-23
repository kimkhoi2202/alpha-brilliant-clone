import { cn } from "../../lib/cn";
import { ProgressBar } from "../ui";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export interface OnboardingChromeProps {
  /** 0–100 step progress. */
  progress: number;
  onBack?: () => void;
  className?: string;
}

/** Onboarding top chrome: back chevron + thin progress bar. */
export function OnboardingChrome({
  progress,
  onBack,
  className,
}: OnboardingChromeProps) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
        >
          <BackIcon />
        </button>
      ) : null}
      <ProgressBar
        value={progress}
        aria-label="Onboarding progress"
        className="flex-1"
      />
    </div>
  );
}
