import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Brand } from "./brand";

export interface NavTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onPress?: () => void;
}

export interface TopNavProps {
  /** Left-hand brand slot (defaults to the AlphaBrilliant mark + wordmark). */
  brand?: ReactNode;
  /** Center navigation tabs (Home / Courses …). Omit for marketing nav. */
  tabs?: NavTabItem[];
  /** Right-hand cluster (premium pill, counters, menu …). */
  endContent?: ReactNode;
  sticky?: boolean;
  className?: string;
}

function NavTab({ tab }: { tab: NavTabItem }) {
  return (
    <button
      type="button"
      onClick={tab.onPress}
      aria-current={tab.active ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-full items-center gap-1.5 overflow-hidden text-sm transition-colors",
        tab.active
          ? "font-medium text-foreground"
          : "text-muted hover:text-foreground",
      )}
    >
      {tab.icon ? (
        <span className="grid size-4 place-items-center" aria-hidden>
          {tab.icon}
        </span>
      ) : null}
      {tab.label}
      {/* Brilliant's underline: parked just below the bar, slides up on hover
          (faint) and stays up when selected (solid). */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-full h-0.5 rounded-full transition-transform duration-150 ease-out",
          tab.active
            ? "-translate-y-0.5 bg-foreground"
            : "bg-muted group-hover:-translate-y-0.5",
        )}
      />
    </button>
  );
}

/**
 * Top application bar. With `tabs` it's the in-app nav (Home / Courses + stat
 * cluster); without tabs it's the marketing nav (brand + a single CTA in
 * `endContent`).
 */
export function TopNav({
  brand = <Brand />,
  tabs,
  endContent,
  sticky = true,
  className,
}: TopNavProps) {
  return (
    <header
      className={cn(
        "z-50 w-full border-b border-border bg-[var(--nav-background)] shadow-[0_1px_10px_rgba(0,0,0,0.18)]",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <div className="flex h-full items-center gap-6">
          {brand}
          {tabs && tabs.length > 0 ? (
            <nav className="hidden h-full items-center gap-6 sm:flex">
              {tabs.map((tab) => (
                <NavTab key={tab.id} tab={tab} />
              ))}
            </nav>
          ) : null}
        </div>
        {endContent ? (
          <div className="ml-auto flex items-center gap-2">{endContent}</div>
        ) : null}
      </div>
    </header>
  );
}
