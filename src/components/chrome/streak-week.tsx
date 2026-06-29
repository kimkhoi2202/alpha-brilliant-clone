import { cn } from "../../lib/cn";
import type { StreakDay } from "./streak-days";
import { StreakDayDisc } from "./streak-day-disc";

export interface StreakWeekProps {
  days: StreakDay[];
  /** Stagger the discs in (the nav popover's entrance). */
  animate?: boolean;
  className?: string;
}

/**
 * The single streak-week strip used by BOTH the nav `StreakMenu` popover and the
 * home `StreakCard`, so the two always render identically: one disc per day with
 * a weekday label, today's label bolded.
 */
export function StreakWeek({ days, animate, className }: StreakWeekProps) {
  return (
    <div className={cn("flex justify-between", className)}>
      {days.map((day, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col items-center gap-1.5",
            animate && "streak-disc",
          )}
          style={animate ? { animationDelay: `${i * 45}ms` } : undefined}
        >
          <StreakDayDisc
            state={day.state === "completed" ? "done" : day.state}
            className="size-8"
          />
          <span
            className={cn(
              "text-xs",
              day.today ? "font-bold text-foreground" : "text-muted",
            )}
          >
            {day.label}
          </span>
        </div>
      ))}
    </div>
  );
}
