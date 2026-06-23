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
  /**
   * Pin to the viewport bottom. Default `true` for the real lesson player. Set
   * `false` in static previews/catalogs so the bar stays in flow instead of
   * floating over other content.
   */
  sticky?: boolean;
  /**
   * Top divider line. Default `true` (separates the bar from content above it,
   * as in a real lesson screen). Set `false` when the bar sits directly under a
   * separate bordered card, where a full-width line reads as a stray rule.
   */
  divider?: boolean;
  className?: string;
}

/** The sticky bottom action bar of the lesson player (Check / Continue …). */
export function FooterCtaBar({
  children,
  startContent,
  centered = true,
  constrain = true,
  sticky = true,
  divider = true,
  className,
}: FooterCtaBarProps) {
  return (
    <div
      className={cn(
        "w-full bg-background",
        divider && "border-t border-border",
        sticky ? "sticky bottom-0 z-30" : "relative",
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
