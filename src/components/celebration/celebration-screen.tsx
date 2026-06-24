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
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** `lg` scales the title/subtitle/buttons up a step for a more prominent
   *  moment (used by the lesson-complete screen). Defaults to `md`. */
  size?: "md" | "lg";
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
  secondaryActionLabel,
  onSecondaryAction,
  size = "md",
  className,
}: CelebrationScreenProps) {
  const lg = size === "lg";
  return (
    <div
      className={cn(
        "flex flex-col items-center px-6 py-12 text-center",
        lg ? "gap-6" : "gap-5",
        className,
      )}
    >
      {art ? (
        <div className="text-6xl" aria-hidden>
          {art}
        </div>
      ) : null}
      <div className="space-y-1">
        <h2
          className={cn(
            "font-bold tracking-tight text-foreground",
            lg ? "text-3xl" : "text-2xl",
          )}
        >
          {title}
        </h2>
        {subtitle ? (
          <div className={cn("text-muted", lg ? "text-lg" : "text-base")}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
      <div className="mt-2 flex w-full items-center justify-center gap-3">
        {secondaryActionLabel ? (
          <Button
            size="lg"
            variant="outline"
            className={cn("flex-1", lg ? "h-14" : "h-12")}
            onPress={onSecondaryAction}
          >
            {secondaryActionLabel}
          </Button>
        ) : null}
        <Button
          size="lg"
          className={cn(
            lg ? "h-14" : "h-12",
            secondaryActionLabel ? "flex-1" : "min-w-48 px-8",
          )}
          onPress={onContinue}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
