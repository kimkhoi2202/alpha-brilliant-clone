import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type ChipIntent = "neutral" | "accent" | "success" | "warning" | "danger";
export type ChipVariant = "soft" | "solid";
export type ChipSize = "sm" | "md";

const SOFT: Record<ChipIntent, string> = {
  neutral: "bg-default text-default-foreground",
  accent: "bg-accent-soft text-accent-soft-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};

const SOLID: Record<ChipIntent, string> = {
  neutral: "bg-default text-default-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
};

const SIZE: Record<ChipSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export interface ChipProps {
  children: ReactNode;
  intent?: ChipIntent;
  variant?: ChipVariant;
  size?: ChipSize;
  startContent?: ReactNode;
  className?: string;
}

/** Small rounded label/tag (Brilliant's "31%", "LEVEL 1", category pills). */
export function Chip({
  children,
  intent = "neutral",
  variant = "soft",
  size = "md",
  startContent,
  className,
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold leading-none",
        (variant === "soft" ? SOFT : SOLID)[intent],
        SIZE[size],
        className,
      )}
    >
      {startContent}
      {children}
    </span>
  );
}
