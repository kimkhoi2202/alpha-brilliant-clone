import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Button } from "../ui";

export interface CelebrationScreenProps {
  /** Placeholder celebration art. */
  art?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  actionLabel?: string;
  onContinue?: () => void;
  className?: string;
}

/** Full-screen reward moment shell (art + title + stat + Continue). */
export function CelebrationScreen({
  art,
  title,
  subtitle,
  children,
  actionLabel = "Continue",
  onContinue,
  className,
}: CelebrationScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 px-6 py-12 text-center",
        className,
      )}
    >
      {art ? (
        <div className="text-6xl" aria-hidden>
          {art}
        </div>
      ) : null}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? <div className="text-base text-muted">{subtitle}</div> : null}
      </div>
      {children}
      <Button size="lg" className="mt-2 min-w-48" onPress={onContinue}>
        {actionLabel}
      </Button>
    </div>
  );
}
