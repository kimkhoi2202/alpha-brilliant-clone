import { useState, type ReactNode } from "react";

import { cn } from "../../lib/cn";
import { Brand } from "./brand";

/**
 * A tab icon. Pass a node for a static icon, or a render function to react to
 * hover/keyboard focus (e.g. an animated icon that plays while `active`).
 */
export type NavTabIcon =
  | ReactNode
  | ((state: { active: boolean }) => ReactNode);

export interface NavTabItem {
  id: string;
  label: string;
  icon?: NavTabIcon;
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
  // Drive hover/focus-aware icons (e.g. an animated Lottie) off the whole tab,
  // not just the small icon box, so hovering "Home" plays the animation.
  const [active, setActive] = useState(false);
  const icon =
    typeof tab.icon === "function" ? tab.icon({ active }) : tab.icon;
  return (
    <button
      type="button"
      onClick={tab.onPress}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      aria-current={tab.active ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-full items-center gap-1.5 overflow-hidden text-sm transition-colors",
        tab.active
          ? "font-medium text-foreground"
          : "text-muted hover:text-foreground",
      )}
    >
      {icon ? (
        <span className="inline-flex items-center justify-center" aria-hidden>
          {icon}
        </span>
      ) : null}
      {tab.label}
      {/* Active-tab underline only: parked below the bar, slides up to sit just
          under the label when selected. No underline on hover. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-full h-0.5 rounded-full transition-transform duration-150 ease-out",
          tab.active ? "-translate-y-3 bg-foreground" : "bg-transparent",
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
          <div className="ml-auto flex items-center gap-3 sm:gap-4">{endContent}</div>
        ) : null}
      </div>
    </header>
  );
}
