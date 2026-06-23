import { Fragment } from "react";

import { cn } from "../../lib/cn";
import { Avatar } from "../ui";

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  you?: boolean;
}

export interface LeaderboardProps {
  entries: LeaderboardEntry[];
  /** Draw an "Advancing" separator after this many rows. */
  advanceCount?: number;
  className?: string;
}

/** Ranked leaderboard with current-user highlight + promotion separator. */
export function Leaderboard({
  entries,
  advanceCount,
  className,
}: LeaderboardProps) {
  return (
    <ol className={cn("space-y-1", className)}>
      {entries.map((e, i) => (
        <Fragment key={e.rank}>
          <li
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2",
              e.you && "bg-success-soft",
            )}
          >
            <span
              className={cn(
                "w-6 text-center text-sm font-bold",
                e.rank <= 3 ? "text-warning" : "text-muted",
              )}
            >
              {e.rank}
            </span>
            <Avatar name={e.name} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-foreground">
              {e.name}
            </span>
            <span className="text-sm font-semibold text-muted">{e.xp} XP</span>
          </li>
          {advanceCount && i + 1 === advanceCount ? (
            <li
              className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-success"
              aria-hidden
            >
              <span className="h-px flex-1 bg-success/40" />
              Advancing to next league
              <span className="h-px flex-1 bg-success/40" />
            </li>
          ) : null}
        </Fragment>
      ))}
    </ol>
  );
}
