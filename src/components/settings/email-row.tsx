import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Badge, type BadgeIntent } from "../ui";

export type EmailStatus = "verified" | "primary" | "unverified";

const STATUS: Record<EmailStatus, { label: string; intent: BadgeIntent }> = {
  verified: { label: "Verified", intent: "success" },
  primary: { label: "Primary", intent: "accent" },
  unverified: { label: "Unverified", intent: "warning" },
};

export interface EmailRowProps {
  email: string;
  status: EmailStatus;
  actions?: ReactNode;
  className?: string;
}

/** Settings email row: address + status badge + per-row actions. */
export function EmailRow({ email, status, actions, className }: EmailRowProps) {
  const s = STATUS[status];
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {email}
      </span>
      <Badge intent={s.intent}>{s.label}</Badge>
      {actions ? (
        <div className="flex items-center gap-1">{actions}</div>
      ) : null}
    </div>
  );
}
