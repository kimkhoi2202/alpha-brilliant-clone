import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface MenuItemProps {
  children: ReactNode;
  onPress?: () => void;
  danger?: boolean;
}

export function MenuItem({ children, onPress, danger }: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onPress}
      className={cn(
        // Inset, rounded rows so the hover fill has padding from the panel edges
        // (the panel's own padding provides the gap).
        "block w-full rounded-lg px-3 py-2.5 text-left text-[15px] font-medium transition-colors hover:bg-default",
        danger ? "text-danger" : "text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-2 h-px bg-separator" role="separator" />;
}

/** Brilliant's rounded caret that ties the panel to its trigger button. */
function MenuArrow({ align }: { align: "center" | "end" }) {
  return (
    <span
      aria-hidden
      style={{ color: "var(--overlay)" }}
      className={cn(
        "pointer-events-none absolute -top-2 drop-shadow-[0_0_6px_rgba(0,0,0,0.35)]",
        align === "end" ? "right-4" : "left-1/2 -translate-x-1/2",
      )}
    >
      <svg width="20" height="10" viewBox="0 0 20 10" fill="none">
        <path
          d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H17.8683C16.8801 8 15.9269 7.63423 15.1924 6.97318L10.3356 2.60207C10.0708 2.3636 9.92918 2.3636 9.66437 2.60207Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export interface MenuPanelProps {
  children: ReactNode;
  className?: string;
  /** Show Brilliant's upward caret, aligned under the trigger button. */
  arrow?: "center" | "end";
}

/** Account / overflow dropdown panel (place inside a Popover for real use). */
export function MenuPanel({ children, className, arrow }: MenuPanelProps) {
  return (
    <div className={cn("relative w-[280px]", className)}>
      {arrow ? <MenuArrow align={arrow} /> : null}
      <div
        role="menu"
        className="overflow-hidden rounded-xl bg-overlay p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
      >
        {children}
      </div>
    </div>
  );
}
