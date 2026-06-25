import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "../../lib/cn";
import { Button } from "./button";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CornerDownRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <polyline points="15 10 20 15 15 20" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </svg>
  );
}

export interface SearchResult {
  id: string;
  label: string;
  onPress?: () => void;
}

export interface SearchProps {
  /** Collapsed-state prompt. */
  placeholder?: string;
  /** Open-state input placeholder. */
  inputPlaceholder?: string;
  /** Right-hand action label. */
  actionLabel?: string;
  /** Suggestions/results; filtered by the query (substring, case-insensitive). */
  results?: SearchResult[];
  /** Fired with the query on submit. */
  onSubmit?: (query: string) => void;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Brilliant's "What do you want to learn?" search: a rounded pill that expands
 * into an elevated panel with a query input and a results list.
 */
export function Search({
  placeholder = "What do you want to learn?",
  inputPlaceholder = "How do large language models work?",
  actionLabel = "Ask",
  results = [],
  onSubmit,
  defaultOpen = false,
  className,
}: SearchProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [panelStyle, setPanelStyle] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(rect.width, 560);

    setPanelStyle({
      left: rect.left,
      // Header (title row) is ~56px tall, so the inner search row lands where
      // the collapsed search pill was. This matches Brilliant's fixed popover.
      top: Math.max(8, rect.top - 56),
      width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    inputRef.current?.focus();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  const filtered = query.trim()
    ? results.filter((r) =>
        r.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : results;

  return (
    <div className={cn("relative", className)}>
      {/* Collapsed trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePanelPosition();
          setOpen(true);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 rounded-full border-2 border-border bg-background py-1 pl-4 pr-1 text-left transition-colors hover:border-foreground/25 focus-visible:border-accent focus-visible:outline-none"
      >
        <SearchIcon className="size-4 shrink-0 text-muted" />
        <span className="line-clamp-1 flex-1 text-sm text-muted">
          {placeholder}
        </span>
        <span className="rounded-full bg-default px-4 py-2 text-sm font-semibold text-muted">
          {actionLabel}
        </span>
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-label={placeholder}
            style={panelStyle ?? undefined}
            className="fixed z-40 max-w-[560px] overflow-hidden rounded-2xl border border-border bg-overlay shadow-2xl shadow-black/60"
          >
            <div className="flex items-center gap-2 py-3 pl-5 pr-3">
              <span className="text-base font-bold text-foreground">
                {placeholder}
              </span>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                clicky={false}
                aria-label="Close"
                className="ml-auto"
                onPress={() => setOpen(false)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <form
              className="px-5 pb-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (query.trim()) onSubmit?.(query.trim());
              }}
            >
              <div className="flex items-center gap-2 rounded-full border-2 border-border bg-background py-1 pl-4 pr-1">
                <SearchIcon className="size-4 shrink-0 text-muted" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted"
                />
                <Button
                  type="submit"
                  size="sm"
                  clicky={false}
                  isDisabled={!query.trim()}
                >
                  {actionLabel}
                </Button>
              </div>
            </form>

            {filtered.length > 0 ? (
              <div className="max-h-64 overflow-y-auto px-3 pb-2 pt-1">
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      r.onPress?.();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <CornerDownRightIcon className="size-4 shrink-0 text-muted" />
                    <span className="line-clamp-1">{r.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
