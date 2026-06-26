import type { ElementType, ReactNode } from "react";

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

export interface SectionHeadingProps {
  /** Optional uppercase kicker rendered above the title (reuses `Eyebrow`). */
  eyebrow?: ReactNode;
  /** The heading content. */
  title: ReactNode;
  /** Optional supporting copy rendered below the title. */
  description?: ReactNode;
  /** Element the title renders as. Defaults to `h2`. */
  as?: ElementType;
  /** Applied to the title element, e.g. as an `aria-labelledby` target. */
  id?: string;
  /** Extra classes for the outer wrapper. */
  className?: string;
}

/**
 * Centered section heading: an optional `Eyebrow`, the title in the shared
 * display scale, and optional muted supporting copy capped to a readable width.
 * A drop-in replacement for hand-written heading blocks so every section lines
 * up identically.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  as: TitleTag = "h2",
  id,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <TitleTag
        id={id}
        className={cn(
          "text-balance text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-foreground",
          eyebrow && "mt-3",
        )}
      >
        {title}
      </TitleTag>
      {description ? (
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Smooth-scroll to an in-page section by id (used by nav + hero CTAs). */
export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
