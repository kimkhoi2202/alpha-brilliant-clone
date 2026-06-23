import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type BadgeIntent =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";

const INTENT: Record<BadgeIntent, string> = {
  neutral: "bg-default text-default-foreground",
  accent: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

export interface BadgeProps {
  children: ReactNode;
  intent?: BadgeIntent;
  className?: string;
}

/** Tiny uppercase status label (Brilliant's VERIFIED / PRIMARY / UNVERIFIED). */
export function Badge({ children, intent = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.625rem] font-bold uppercase leading-none tracking-wider",
        INTENT[intent],
        className,
      )}
    >
      {children}
    </span>
  );
}
