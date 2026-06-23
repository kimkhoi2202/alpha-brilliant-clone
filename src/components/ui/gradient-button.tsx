import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface GradientButtonProps {
  children: ReactNode;
  onPress?: () => void;
  fullWidth?: boolean;
  pill?: boolean;
  className?: string;
}

/** Premium-emphasis button with Brilliant's iridescent gradient fill. */
export function GradientButton({
  children,
  onPress,
  fullWidth,
  pill,
  className,
}: GradientButtonProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      style={{ backgroundImage: "var(--bp-gradient-iridescent)" }}
      className={cn(
        "inline-flex h-10 items-center justify-center px-5 text-sm font-semibold text-white transition-transform active:scale-[0.98]",
        pill ? "rounded-full" : "rounded-lg",
        fullWidth && "w-full",
        className,
      )}
    >
      {children}
    </button>
  );
}
