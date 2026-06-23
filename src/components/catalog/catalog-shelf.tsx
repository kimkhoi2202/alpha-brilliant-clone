import type { ReactNode } from "react";

export interface CatalogShelfProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/** A learning-path group: header + horizontally scrolling tile shelf. */
export function CatalogShelf({
  title,
  subtitle,
  children,
  className,
}: CatalogShelfProps) {
  return (
    <section className={className}>
      <div className="mb-3">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="flex gap-4 overflow-x-auto rounded-2xl bg-surface/40 p-4 [scrollbar-width:thin]">
        {children}
      </div>
    </section>
  );
}
