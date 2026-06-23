import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface FooterCtaBarProps {
  /** Primary action(s) — typically a single full-width Button. */
  children: ReactNode;
  /** Secondary content pinned to the start (e.g. a "Start over" link). */
  startContent?: ReactNode;
  /** Center + constrain the action to a comfortable width (Brilliant default). */
  centered?: boolean;
  className?: string;
}

/** The sticky bottom action bar of the lesson player (Check / Continue …). */
export function FooterCtaBar({
  children,
  startContent,
  centered = true,
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
        <div className={cn(centered && !startContent && "w-full max-w-xs")}>
          {children}
        </div>
      </div>
    </div>
  );
}
