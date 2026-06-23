import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface MascotHeaderProps {
  /** Reacts to the previous answer in real flows. */
  title: string;
  subtitle?: string;
  /** Placeholder mascot (Koji) art. */
  mascot?: ReactNode;
  className?: string;
}

/** Onboarding mascot + dynamic title header. */
export function MascotHeader({
  title,
  subtitle,
  mascot,
  className,
}: MascotHeaderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <span
        className="grid size-16 place-items-center rounded-3xl bg-success text-3xl text-success-foreground"
        aria-hidden
      >
        {mascot ?? "◆"}
      </span>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? <p className="text-base text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}
