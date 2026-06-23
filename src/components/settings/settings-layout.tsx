import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface SettingsNavItem {
  id: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export interface SettingsLayoutProps {
  nav: SettingsNavItem[];
  children: ReactNode;
  className?: string;
}

/** Two-column settings shell: left sub-nav card + right content column. */
export function SettingsLayout({ nav, children, className }: SettingsLayoutProps) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-[180px_1fr]", className)}>
      <nav className="h-fit rounded-2xl border border-border bg-surface p-2">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onPress}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              item.active
                ? "bg-default text-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="space-y-8">{children}</div>
    </div>
  );
}

export interface SettingsSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** A titled settings block. */
export function SettingsSection({
  title,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}
