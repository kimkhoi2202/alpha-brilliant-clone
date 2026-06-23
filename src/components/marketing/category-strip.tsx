import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface CategoryItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface CategoryStripProps {
  items: CategoryItem[];
  className?: string;
}

/** Marketing subject strip (Math · Computer Science · …). */
export function CategoryStrip({ items, className }: CategoryStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-border py-4",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {item.icon ? <span aria-hidden>{item.icon}</span> : null}
          {item.label}
        </button>
      ))}
    </div>
  );
}
