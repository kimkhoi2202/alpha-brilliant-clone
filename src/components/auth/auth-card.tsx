import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export interface AuthCardProps {
  title: string;
  logo?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Centered auth card (sign in / sign up) — drop into a Modal or use inline. */
export function AuthCard({
  title,
  logo,
  onClose,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/30",
        className,
      )}
    >
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
        >
          <CloseIcon />
        </button>
      ) : null}
      <div className="mb-5 flex flex-col items-center gap-3 text-center">
        {logo ?? (
          <span className="grid size-12 place-items-center rounded-2xl bg-success text-2xl text-success-foreground">
            ◆
          </span>
        )}
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
      {footer ? (
        <div className="mt-5 text-center text-sm text-muted">{footer}</div>
      ) : null}
    </div>
  );
}
