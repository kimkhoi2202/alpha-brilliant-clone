import type { ReactNode } from "react";

import type { GenerationDifficulty } from "../../lib/ai/client";
import { cn } from "../../lib/cn";

/** Header info shown across loading / problem / error states of a session. */
export interface PracticeSessionStats {
  /** Problems solved this session. */
  solved: number;
  /** Current run of consecutive correct answers. */
  streak: number;
  /** Difficulty the next problem will target. */
  difficulty: GenerationDifficulty;
}

export interface PracticeShellProps {
  stats: PracticeSessionStats;
  onExit: () => void;
  /** Greens the stage frame + raises a soft glow (only on a correct answer). */
  correct?: boolean;
  /** Feedback pill shown just above the footer CTA. */
  toast?: ReactNode;
  /** Bottom action row (Check / Next problem / Try again …). */
  footer: ReactNode;
  children: ReactNode;
}

const DIFFICULTY_LABEL: Record<GenerationDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const DIFFICULTY_CLASS: Record<GenerationDifficulty, string> = {
  easy: "bg-success/15 text-success",
  medium: "bg-accent/15 text-accent-soft-foreground",
  hard: "bg-warning/15 text-warning",
};

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

function DifficultyPill({ difficulty }: { difficulty: GenerationDifficulty }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        DIFFICULTY_CLASS[difficulty],
      )}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

function SessionStats({ solved, streak }: { solved: number; streak: number }) {
  return (
    <div className="flex items-center gap-4 text-sm font-semibold text-muted">
      <span>
        <span className="tabular-nums text-foreground">{solved}</span> solved
      </span>
      <span aria-label={`${streak} in a row`}>
        <span className="tabular-nums text-foreground">{streak}</span> streak
      </span>
    </div>
  );
}

/**
 * The Infinite Practice frame: a slim header (exit, title, adaptive difficulty,
 * session stats) above a bordered stage, mirroring the lesson player's canvas so
 * practice feels native — without coupling to the lesson runner's Koji/calculator.
 */
export function PracticeShell({
  stats,
  onExit,
  correct = false,
  toast,
  footer,
  children,
}: PracticeShellProps) {
  return (
    <div className="relative flex h-svh flex-col overflow-hidden bg-background">
      <header className="sticky top-0 z-40 w-full bg-background">
        <div className="relative flex h-20 items-center px-4 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit practice"
            className="relative grid size-10 shrink-0 touch-manipulation place-items-center rounded-[20px] text-muted transition-[color,background-color,border-radius] duration-200 ease-out before:absolute before:-inset-1 before:content-[''] hover:rounded-xl hover:bg-default hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none"
          >
            <CloseIcon />
          </button>
          <div className="mx-auto flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight text-foreground sm:text-base">
              Infinite Practice
            </span>
            <DifficultyPill difficulty={stats.difficulty} />
          </div>
          <div className="hidden sm:block">
            <SessionStats solved={stats.solved} streak={stats.streak} />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 px-3 pb-3 pt-1 sm:px-6 sm:pb-6 md:px-10 md:pb-8 xl:px-12">
        <h1 className="sr-only">Infinite Practice</h1>
        <div
          className={cn(
            "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border-2 transition-colors duration-300 sm:rounded-[28px]",
            correct ? "border-success" : "border-[color:var(--lesson-frame)]",
          )}
        >
          {/* Success glow: a soft green wash rising from the bottom edge. */}
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

          <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-6 sm:py-8">
            {/* The stage settles in on mount; PracticeProblem remounts per
                problem (keyed by token), so the next-problem swap re-arms it. */}
            <div className="practice-stage-in m-auto w-full max-w-3xl">
              {children}
            </div>
          </div>

          <div className="relative z-10 shrink-0">
            {toast ? (
              <div className="pointer-events-none absolute bottom-full left-4 z-50 mb-4 sm:left-6">
                <div className="pointer-events-auto w-fit">{toast}</div>
              </div>
            ) : null}
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
