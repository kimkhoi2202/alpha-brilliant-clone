import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type CalloutIntent = "info" | "warning" | "danger" | "neutral";

const INTENT: Record<
  CalloutIntent,
  { base: string; icon: string; iconBg: string }
> = {
  info: {
    base: "border-accent/25 bg-accent-soft/45",
    icon: "text-accent",
    iconBg: "bg-accent/12",
  },
  warning: {
    base: "border-warning/30 bg-warning-soft/45",
    icon: "text-warning",
    iconBg: "bg-warning/12",
  },
  danger: {
    base: "border-danger/25 bg-danger-soft/35",
    icon: "text-danger",
    iconBg: "bg-danger/12",
  },
  neutral: {
    base: "border-border bg-default/70",
    icon: "text-muted",
    iconBg: "bg-white/[0.04]",
  },
};

function StatusIcon({ intent }: { intent: CalloutIntent }) {
  if (intent === "warning") {
    return (
      <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
        <path
          d="M8 1.5 15 14H1L8 1.5Zm0 3.75a.75.75 0 0 0-.75.75v3.25a.75.75 0 0 0 1.5 0V6A.75.75 0 0 0 8 5.25Zm0 6.9a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (intent === "danger") {
    return (
      <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
        <path
          d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm2.95 8.39-1.06 1.06L8 9.06l-1.89 1.89-1.06-1.06L6.94 8 5.05 6.11l1.06-1.06L8 6.94l1.89-1.89 1.06 1.06L9.06 8l1.89 1.89Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
      <path
        d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm.75 10.25h-1.5V7h1.5v4.75ZM8 5.85a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
  const styles = INTENT[intent];

  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-2xl border p-4 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]",
        styles.base,
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full",
          styles.icon,
          styles.iconBg,
        )}
      >
        {icon ?? <StatusIcon intent={intent} />}
      </span>
      <div className="min-w-0 space-y-1">
        {title ? (
          <p className="text-sm font-semibold leading-5 tracking-[-0.01em]">
            {title}
          </p>
        ) : null}
        {children ? (
          <div className="text-sm leading-5 text-muted">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
