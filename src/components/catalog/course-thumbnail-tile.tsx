import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Badge } from "../ui";

export interface CourseThumbnailTileProps {
  icon?: ReactNode;
  label: string;
  badge?: "new";
  /** In-progress hairline (0–100). */
  progress?: number;
  archived?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Catalog course tile: icon square + label, with NEW badge / progress / archived. */
export function CourseThumbnailTile({
  icon,
  label,
  badge,
  progress,
  archived = false,
  onPress,
  className,
}: CourseThumbnailTileProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "group flex w-full flex-col items-center gap-2 text-center",
        className,
      )}
    >
      <div className="relative w-full">
        <div
          className={cn(
            "grid aspect-square w-full place-items-center rounded-2xl border border-border bg-surface text-4xl transition-transform duration-200 group-hover:-translate-y-0.5",
            archived && "opacity-80 grayscale",
          )}
          aria-hidden
        >
          {icon ?? "📦"}
        </div>
        {badge === "new" ? (
          <span className="absolute left-2 top-2">
            <Badge intent="success">New</Badge>
          </span>
        ) : null}
        {progress != null ? (
          <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-default">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        ) : null}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          archived ? "text-muted" : "text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}
