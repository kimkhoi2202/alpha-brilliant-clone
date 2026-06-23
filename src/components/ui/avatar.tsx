import { cn } from "../../lib/cn";

export type AvatarSize = "sm" | "md" | "lg";

const SIZE: Record<AvatarSize, string> = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
};

const PALETTE = [
  "bg-accent text-accent-foreground",
  "bg-success text-success-foreground",
  "bg-warning text-warning-foreground",
  "bg-danger text-danger-foreground",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

/** Color-coded initial avatar (deterministic color from the name). */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const color = PALETTE[hashName(name) % PALETTE.length];
  return (
    <span
      aria-label={name}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-bold",
        SIZE[size],
        color,
        className,
      )}
    >
      {initial}
    </span>
  );
}
