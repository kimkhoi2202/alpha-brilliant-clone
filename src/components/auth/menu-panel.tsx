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
        "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-default",
        danger ? "text-danger" : "text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-separator" role="separator" />;
}

export interface MenuPanelProps {
  children: ReactNode;
  className?: string;
}

/** Account / overflow dropdown panel (place inside a Popover for real use). */
export function MenuPanel({ children, className }: MenuPanelProps) {
  return (
    <div
      role="menu"
      className={cn(
        "w-56 rounded-xl border border-border bg-overlay p-1.5 shadow-xl shadow-black/30",
        className,
      )}
    >
      {children}
    </div>
  );
}
