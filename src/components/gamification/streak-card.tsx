import { cn } from "../../lib/cn";
import { StreakBolt } from "../chrome";

export interface StreakDay {
  label: string;
  state: "completed" | "current" | "upcoming";
}

export interface StreakCardProps {
  count: number;
  message?: string;
  days: StreakDay[];
  className?: string;
}

/** Home streak card: count + message + week strip of day circles. */
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
      <div className="mt-4 flex justify-between">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={cn(
                "grid size-8 place-items-center rounded-full text-xs",
                d.state === "completed"
                  ? "bg-success text-success-foreground"
                  : d.state === "current"
                    ? "border-2 border-accent text-foreground"
                    : "bg-default text-muted",
              )}
              aria-hidden
            >
              <StreakBolt completed={d.state !== "upcoming"} className="size-4" />
            </span>
            <span
              className={cn(
                "text-xs",
                d.state === "current"
                  ? "font-bold text-foreground"
                  : "text-muted",
              )}
            >
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
