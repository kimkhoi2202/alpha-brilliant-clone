import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type ToastIntent = "success" | "info" | "danger";

const INTENT: Record<ToastIntent, string> = {
  success: "bg-success text-success-foreground",
  info: "border border-border bg-surface text-foreground",
  danger: "bg-danger text-danger-foreground",
};

const ICON: Record<ToastIntent, string> = {
  success: "✓",
  info: "ℹ️",
  danger: "⛔",
};

export interface ToastProps {
  intent?: ToastIntent;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-4" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** Presentational toast (success / info / danger). */
export function Toast({
  intent = "success",
  children,
  onClose,
  className,
}: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg shadow-black/20",
        INTENT[intent],
        className,
      )}
    >
      <span aria-hidden>{ICON[intent]}</span>
      <span>{children}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="ml-2 opacity-70 transition-opacity hover:opacity-100"
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}
