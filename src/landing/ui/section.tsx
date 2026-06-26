import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface LandingSectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Container width: `default` (max-w-5xl) or `wide` (max-w-6xl). */
  width?: "default" | "wide";
}

/**
 * Marketing section wrapper: consistent vertical rhythm, a centered container,
 * and a nav anchor. Sections compose the app's real components inside this so
 * spacing stays uniform across the landing page.
 */
export function LandingSection({
  id,
  children,
  className,
  width = "default",
}: LandingSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-20 sm:py-24", className)}>
      <div
        className={cn(
          "mx-auto px-4 sm:px-6",
          width === "wide" ? "max-w-6xl" : "max-w-5xl",
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** Small uppercase kicker above a section heading (brand accent). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "text-xs font-bold uppercase tracking-[0.16em] text-[var(--link)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Smooth-scroll to an in-page section by id (used by nav + hero CTAs). */
export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
