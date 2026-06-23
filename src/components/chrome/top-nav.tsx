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
        "relative inline-flex h-14 items-center gap-1.5 text-sm font-medium transition-colors",
        tab.active ? "text-foreground" : "text-muted hover:text-foreground",
      )}
    >
      {tab.icon ? (
        <span className="grid size-4 place-items-center" aria-hidden>
          {tab.icon}
        </span>
      ) : null}
      {tab.label}
      {tab.active ? (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />
      ) : null}
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
        "z-40 w-full border-b border-border bg-background/80 backdrop-blur",
        sticky && "sticky top-0",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          {brand}
          {tabs && tabs.length > 0 ? (
            <nav className="hidden items-center gap-5 sm:flex">
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
