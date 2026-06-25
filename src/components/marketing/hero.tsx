import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface HeroProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** CTA buttons. */
  actions?: ReactNode;
  className?: string;
}

/** Marketing hero (serif display headline + subhead + CTAs). */
export function Hero({ title, subtitle, actions, className }: HeroProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6 py-12 text-center",
        className,
      )}
    >
      <h1 className="max-w-3xl font-serif text-5xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="max-w-xl text-lg text-muted">{subtitle}</p>
      ) : null}
      {actions ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
