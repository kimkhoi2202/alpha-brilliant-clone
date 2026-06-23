import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type CalloutIntent = "info" | "warning" | "danger" | "neutral";

const INTENT: Record<CalloutIntent, string> = {
  info: "border-l-accent bg-accent-soft",
  warning: "border-l-warning bg-warning-soft",
  danger: "border-l-danger bg-danger-soft",
  neutral: "border-l-border bg-default",
};

const ICON: Record<CalloutIntent, string> = {
  info: "ℹ️",
  warning: "⚠️",
  danger: "⛔",
  neutral: "💬",
};

export interface CalloutProps {
  intent?: CalloutIntent;
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Left-accent informational/warning/danger callout (Brilliant pattern). */
export function Callout({
  intent = "info",
  title,
  children,
  icon,
  className,
}: CalloutProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-xl border-l-4 p-4 text-foreground",
        INTENT[intent],
        className,
      )}
    >
      <span className="text-base leading-6" aria-hidden>
        {icon ?? ICON[intent]}
      </span>
      <div className="space-y-0.5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-sm text-muted">{children}</div> : null}
      </div>
    </div>
  );
}
