import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export interface DisclosureProps {
  title: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/** Collapsible section (e.g. "Archived courses"). */
export function Disclosure({
  title,
  defaultOpen = false,
  children,
  className,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <Chevron open={open} />
        {title}
      </button>
      {open ? <div className="pt-2">{children}</div> : null}
    </div>
  );
}
