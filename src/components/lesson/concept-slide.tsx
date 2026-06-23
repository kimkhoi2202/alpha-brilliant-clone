import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface ConceptSlideProps {
  /** Placeholder illustration. */
  icon?: ReactNode;
  title: string;
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
      <h2 className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {children ? (
        <div className="mt-3 text-base leading-relaxed text-muted">
          {children}
        </div>
      ) : null}
    </div>
  );
}
