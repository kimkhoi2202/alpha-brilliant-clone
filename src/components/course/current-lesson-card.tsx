import { cn } from "../../lib/cn";
import { Button, type ButtonVariant } from "../ui";

export interface CurrentLessonCardProps {
  title: string;
  /** Small eyebrow above the title (e.g. "Up next"). */
  subtitle?: string;
  actionLabel?: string;
  /** Button intent: accent for the current lesson, secondary for a jump. */
  variant?: ButtonVariant;
  onStart?: () => void;
  className?: string;
}

/** Floating "current lesson → Start" card anchored to the course map. */
export function CurrentLessonCard({
  title,
  subtitle,
  actionLabel = "Start",
  variant = "primary",
  onStart,
  className,
}: CurrentLessonCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-4 text-center shadow-lg shadow-black/20",
        className,
      )}
    >
      {subtitle ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {subtitle}
        </p>
      ) : null}
      <p className="mb-3 mt-0.5 text-base font-bold text-foreground">{title}</p>
      <Button fullWidth variant={variant} onPress={onStart}>
        {actionLabel}
      </Button>
    </div>
  );
}
