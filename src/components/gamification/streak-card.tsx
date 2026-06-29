import { cn } from "../../lib/cn";
import { StreakBolt, StreakWeek, type StreakDay } from "../chrome";

export type { StreakDay };

export interface StreakCardProps {
  count: number;
  message?: string;
  days: StreakDay[];
  className?: string;
}

/** Home streak card: count + message + the shared week strip of day discs. */
export function StreakCard({ count, message, days, className }: StreakCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-foreground">{count}</span>
        <StreakBolt completed className="streak-bolt-pulse h-7 w-5" />
        <span className="text-sm font-medium text-muted">day streak</span>
      </div>
      {message ? <p className="mt-1 text-sm text-muted">{message}</p> : null}
      <StreakWeek days={days} className="mt-4" />
    </div>
  );
}
