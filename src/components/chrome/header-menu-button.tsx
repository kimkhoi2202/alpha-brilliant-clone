import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export interface HeaderMenuButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen?: boolean;
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 4H0V2h16v2Z" fill="currentColor" />
      <path d="M16 9H0V7h16v2Z" fill="currentColor" />
      <path d="M0 14h16v-2H0v2Z" fill="currentColor" />
    </svg>
  );
}

/** Brilliant's header dropdown trigger: transparent until hover/open. */
export function HeaderMenuButton({
  isOpen,
  className,
  type = "button",
  "aria-label": ariaLabel = "Menu",
  ...props
}: HeaderMenuButtonProps) {
  return (
    <button
      {...props}
      type={type}
      aria-label={ariaLabel}
      aria-haspopup={props["aria-haspopup"] ?? "menu"}
      aria-expanded={isOpen ?? props["aria-expanded"]}
      data-open={isOpen ? "true" : undefined}
      className={cn(
        "flex items-center justify-center rounded-md p-2 text-foreground transition-[background-color,color] duration-100 ease-linear sm:p-3",
        "hover:bg-default focus-visible:bg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15",
        "active:bg-surface-tertiary data-[open=true]:bg-default",
        className,
      )}
    >
      <MenuIcon />
    </button>
  );
}
