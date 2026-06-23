import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface FooterCtaBarProps {
  /** Primary action(s) — a single Check, or colored feedback buttons. */
  children: ReactNode;
  /** Secondary content pinned to the start (e.g. a "Start over" link). */
  startContent?: ReactNode;
  /** Center the action(s). Default true. */
  centered?: boolean;
  /** Constrain a single CTA to a comfortable width (Brilliant's Check). Default true. */
  constrain?: boolean;
  className?: string;
}

/** The sticky bottom action bar of the lesson player (Check / Continue …). */
export function FooterCtaBar({
  children,
  startContent,
  centered = true,
  constrain = true,
  className,
}: FooterCtaBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-40 w-full border-t border-border bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-3xl items-center gap-3 px-4 py-3",
          startContent
            ? "justify-between"
            : centered
              ? "justify-center"
              : "justify-end",
        )}
      >
        {startContent ? (
          <div className="flex items-center">{startContent}</div>
        ) : null}
        <div
          className={cn(
            !startContent && constrain
              ? "w-full max-w-xs"
              : "flex items-center justify-center gap-2",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
