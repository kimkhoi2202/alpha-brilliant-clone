import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface ConceptSlideProps {
  /** Placeholder illustration. */
  icon?: ReactNode;
  /** Optional heading. When absent, only the body renders (no empty gap). */
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** Non-graded teaching step (advances with Continue, no Check). */
export function ConceptSlide({
  icon,
  title,
  children,
  className,
}: ConceptSlideProps) {
  return (
    <div className={cn("mx-auto max-w-md text-center", className)}>
      {icon ? (
        <div className="mb-4 text-5xl" aria-hidden>
          {icon}
        </div>
      ) : null}
      {title ? (
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
      ) : null}
      {children ? (
        <div
          className={cn(
            "text-lg leading-relaxed text-muted",
            title ? "mt-4" : undefined,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
