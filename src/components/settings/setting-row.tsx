import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface SettingRowProps {
  /** Leading icon / avatar slot. */
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  /** Trailing content: a badge, value, button, or Toggle. */
  children?: ReactNode;
  className?: string;
}

/**
 * Bordered label + description row with a trailing control slot. Used for
 * read-only info (e.g. "Member since"), connected accounts, and toggle rows.
 */
export function SettingRow({
  icon,
  label,
  description,
  children,
  className,
}: SettingRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <div className="min-w-0">
          <div className="font-medium text-foreground">{label}</div>
          {description ? (
            <div className="text-sm text-muted">{description}</div>
          ) : null}
        </div>
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
