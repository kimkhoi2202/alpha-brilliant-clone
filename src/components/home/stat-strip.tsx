import { cn } from "../../lib/cn";

export interface StatStripProps {
  streak: number;
  longest: number;
  weekXp: number;
  mastered: number;
  totalSkills: number;
  reviewsDue: number;
  className?: string;
}

/**
 * One stat. On mobile it's a compact horizontal row (label left, value right);
 * from `sm` up it becomes a centered tile (value over label) in the 4-up grid.
 */
function StatTile({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 sm:min-h-28 sm:flex-col sm:items-center sm:justify-center sm:gap-0 sm:py-4 sm:text-center">
      <p className="order-2 shrink-0 text-2xl font-bold tabular-nums text-foreground sm:order-none">
        {value}
      </p>
      <div className="order-1 min-w-0 sm:order-none sm:mt-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {sub ? (
          <p className="mt-0.5 text-xs tabular-nums text-muted">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * A compact strip of headline learner stats for the Home dashboard.
 * Presentational only (every value is passed in). Single column on mobile for
 * easy scanning; four equal tiles from `sm` up, so no single number reads as a
 * hero metric.
 */
export function StatStrip({
  streak,
  longest,
  weekXp,
  mastered,
  totalSkills,
  reviewsDue,
  className,
}: StatStripProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-4", className)}>
      <StatTile value={streak} label="Day streak" sub={`best ${longest}`} />
      <StatTile value={weekXp} label="XP this week" />
      <StatTile value={`${mastered}/${totalSkills}`} label="Skills mastered" />
      <StatTile value={reviewsDue} label="To review" />
    </div>
  );
}
