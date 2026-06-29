import { Fragment } from "react";

import { cn } from "../../lib/cn";

function Yes() {
  return (
    <span className="inline-grid size-5 place-items-center rounded-full bg-success text-xs text-success-foreground" aria-label="Included">
      ✓
    </span>
  );
}
function No() {
  return (
    <span className="inline-grid size-5 place-items-center rounded-full bg-default text-xs text-muted" aria-label="Not included">
      ✕
    </span>
  );
}

export interface PaywallRow {
  label: string;
  free: boolean;
  premium: boolean;
}

export interface PaywallComparisonProps {
  rows: PaywallRow[];
  className?: string;
}

/** Free vs Premium comparison table (neutral columns). */
export function PaywallComparison({ rows, className }: PaywallComparisonProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border",
        className,
      )}
    >
      <div className="grid grid-cols-[1fr_6.5rem_6.5rem]">
        <div className="bg-surface px-4 py-3 text-sm font-bold text-foreground">
          Benefits
        </div>
        <div className="bg-surface px-4 py-3 text-center text-sm font-bold text-muted">
          Free
        </div>
        <div className="bg-surface px-4 py-3 text-center text-sm font-bold text-foreground">
          Premium
        </div>
        {rows.map((r) => (
          <Fragment key={r.label}>
            <div className="border-t border-border px-4 py-3 text-sm text-foreground">
              {r.label}
            </div>
            <div className="border-t border-border px-4 py-3 text-center">
              {r.free ? <Yes /> : <No />}
            </div>
            <div className="border-t border-border px-4 py-3 text-center">
              {r.premium ? <Yes /> : <No />}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
