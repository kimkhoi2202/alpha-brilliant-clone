import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface PromptProps {
  children: ReactNode;
  align?: "left" | "center";
  className?: string;
}

/** The question prompt at the top of a lesson step. */
export function Prompt({ children, align = "left", className }: PromptProps) {
  return (
    <h2
      className={cn(
        "text-lg font-medium leading-snug text-foreground",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </h2>
  );
}
