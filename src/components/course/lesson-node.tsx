import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type LessonNodeState = "active" | "locked" | "completed";

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" />
    </svg>
  );
}

const MEDALLION: Record<LessonNodeState, string> = {
  active: "bg-success text-success-foreground ring-4 ring-accent/30",
  completed: "bg-warning text-warning-foreground",
  locked: "bg-default text-muted",
};

function defaultIcon(state: LessonNodeState) {
  if (state === "completed") return <CheckIcon />;
  if (state === "active") return <StarIcon />;
  return <LockIcon />;
}

export interface LessonNodeProps {
  label: string;
  state?: LessonNodeState;
  /** Placeholder medallion content; defaults to a state glyph. */
  icon?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** A single node on the course map (placeholder medallion + label). */
export function LessonNode({
  label,
  state = "locked",
  icon,
  onPress,
  className,
}: LessonNodeProps) {
  const locked = state === "locked";
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={locked}
      aria-current={state === "active" ? "step" : undefined}
      className={cn(
        "group flex items-center gap-4 text-left disabled:cursor-not-allowed",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-14 shrink-0 place-items-center rounded-full transition-transform",
          MEDALLION[state],
          !locked && "group-hover:scale-105",
        )}
        aria-hidden
      >
        {icon ?? defaultIcon(state)}
      </span>
      <span
        className={cn(
          "text-base font-semibold",
          locked ? "text-muted" : "text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
