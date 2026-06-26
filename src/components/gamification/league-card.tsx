import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { ProgressBar } from "../ui";

export interface LeagueCardProps {
  variant: "locked" | "active";
  /** Caps label, e.g. "HYDROGEN LEAGUE" or "UNLOCK LEAGUES". */
  title: string;
  subtitle?: string;
  /** Locked-state XP progress. */
  progress?: { current: number; total: number };
  /** Active-state body (e.g. a <Leaderboard />). */
  children?: ReactNode;
  className?: string;
}

/** Home league card: locked (XP gate) vs active (leaderboard). */
export function LeagueCard({
  variant,
  title,
  subtitle,
  progress,
  children,
  className,
}: LeagueCardProps) {
  const locked = variant === "locked";
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5",
        locked && "opacity-90",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-xl text-xl",
            locked ? "bg-default text-muted grayscale" : "bg-accent-soft",
          )}
          aria-hidden
        >
          {locked ? "🔒" : "🛡️"}
        </span>
        <div>
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-wider",
              locked ? "text-muted" : "text-accent-soft-foreground",
            )}
          >
            {title}
          </p>
          {subtitle ? (
            <p className="text-sm text-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>

      {locked && progress ? (
        <div className="mt-4 space-y-1.5">
          <ProgressBar
            value={(progress.current / progress.total) * 100}
            intent="accent"
            aria-label="League progress"
          />
          <p className="text-xs text-muted">
            {progress.current} of {progress.total} XP
          </p>
        </div>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
