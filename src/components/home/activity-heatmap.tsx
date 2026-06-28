import { useId } from "react";

import { cn } from "../../lib/cn";
import { today } from "../../lib/date";
import type { DailyActivity } from "../../lib/learner";

export interface ActivityHeatmapProps {
  /** Daily activity, oldest first (the caller passes ~42 zero-filled days). */
  days: DailyActivity[];
  className?: string;
}

/**
 * XP intensity → cell style. Index 0 is an empty day (hairline only); 1–4 are
 * four steps of accent alpha. Thresholds are anchored on the ~30 XP daily goal:
 * a light touch, a goal-sized day, a strong day, a standout day.
 */
const FILL = [
  "border-border bg-transparent",
  "border-transparent bg-accent/20",
  "border-transparent bg-accent/40",
  "border-transparent bg-accent/65",
  "border-transparent bg-accent/90",
] as const;

function intensity(xp: number): number {
  if (xp <= 0) return 0;
  if (xp < 15) return 1;
  if (xp < 30) return 2;
  if (xp < 60) return 3;
  return 4;
}

/** Local weekday with Monday as row 0, matching the app's Monday-based week. */
function weekdayMon0(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** Sparse weekday labels (Mon / Wed / Fri), like a GitHub contribution grid. */
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""] as const;

/** A GitHub-style activity grid: one column per week, weekday rows, XP-tinted. */
export function ActivityHeatmap({ days, className }: ActivityHeatmapProps) {
  const headingId = useId();
  const todayStr = today();

  // Pad the first column so each row lands on a consistent weekday (Mon..Sun).
  const leadPad = days.length > 0 ? weekdayMon0(days[0].date) : 0;
  const cells: (DailyActivity | null)[] = [
    ...Array.from({ length: leadPad }, () => null),
    ...days,
  ];

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "rounded-2xl border-2 border-border bg-background p-6",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          Activity
        </h2>
        <span className="text-xs tabular-nums text-muted">
          Last {days.length} days
        </span>
      </div>

      {days.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No activity yet. Solve a problem to light this up.
        </p>
      ) : (
        <div className="mt-4 flex gap-2">
          <div
            className="grid gap-1 [grid-template-rows:repeat(7,0.875rem)]"
            aria-hidden
          >
            {DAY_LABELS.map((label, i) => (
              <span
                key={i}
                className="text-[10px] leading-[0.875rem] text-muted"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-flow-col gap-1 [grid-template-rows:repeat(7,0.875rem)]">
            {cells.map((day, i) =>
              day ? (
                <div
                  key={day.date}
                  role="img"
                  title={`${day.date}: ${day.xp} XP`}
                  aria-label={`${day.date}: ${day.xp} XP`}
                  className={cn(
                    "size-3.5 rounded-[3px] border",
                    FILL[intensity(day.xp)],
                    day.date === todayStr && "ring-2 ring-foreground",
                  )}
                />
              ) : (
                <div key={`pad-${i}`} className="size-3.5" aria-hidden />
              ),
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted">
        <span>Less</span>
        <div className="flex items-center gap-1" aria-hidden>
          {FILL.map((fill, i) => (
            <div key={i} className={cn("size-3 rounded-[3px] border", fill)} />
          ))}
        </div>
        <span>More</span>
      </div>
    </section>
  );
}
