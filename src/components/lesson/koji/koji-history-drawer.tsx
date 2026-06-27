/**
 * KojiHistoryDrawer (PRD-phase-2 §4.1 follow-up): an in-card slide-in drawer that
 * lists the learner's past Koji conversations, newest-first. A lesson can have
 * several chats (via the panel's "new chat"), so multiple rows can share a lesson
 * title — the relative time disambiguates them.
 *
 * It slides over the panel's chat surface from the right (respecting reduced
 * motion — opacity-only then), lists each saved conversation as
 * "title · last-message snippet · relative time", and calls `onSelect` so the
 * panel can load that conversation to view + continue. A back affordance closes
 * the drawer to return to the current conversation.
 *
 * Data is fetched fresh each time the drawer opens via `listConversations`, which
 * is per-user and AI-off-safe (returns `[]`), so this component renders an empty
 * state rather than ever leaking another learner's data.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  listConversations,
  type ConversationSummary,
} from "../../../lib/ai/conversation-history";
import { cn } from "../../../lib/cn";

/** Shared easing token (Emil Kowalski blueprint), inlined for Motion. */
const EASE_OUT_CUBIC = [0.215, 0.61, 0.355, 1] as const;

export interface KojiHistoryDrawerProps {
  /** Whether the drawer is shown (drives the slide-in / out). */
  open: boolean;
  /** The conversation currently active (highlighted in the list). */
  activeConversationId: string;
  /** Load the chosen conversation into the panel to view + continue. */
  onSelect: (summary: ConversationSummary) => void;
  /** Close the drawer and return to the current conversation. */
  onClose: () => void;
}

/** Compact "x ago" for a past update timestamp (epoch-ms). */
function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ms).toLocaleDateString();
}

export function KojiHistoryDrawer({
  open,
  activeConversationId,
  onSelect,
  onClose,
}: KojiHistoryDrawerProps) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          // Slide in over the chat surface; reduced motion → opacity only.
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: "100%" }}
          transition={{ duration: reduce ? 0.12 : 0.24, ease: EASE_OUT_CUBIC }}
          className="absolute inset-0 z-20 flex flex-col rounded-[inherit] bg-background"
          role="region"
          aria-label="Past conversations"
        >
          <header className="flex shrink-0 items-center gap-2 px-3 py-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to conversation"
              className="grid size-9 shrink-0 touch-manipulation place-items-center rounded-full text-muted outline-none transition-colors hover:bg-default hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4">
                <path
                  d="M10 3.5 5.5 8l4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-foreground">
              Past conversations
            </h2>
          </header>

          <HistoryList
            activeConversationId={activeConversationId}
            onSelect={onSelect}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * The scrollable list itself — fetched fresh on mount (i.e. each time the drawer
 * opens). Kept separate so the fetch re-runs per open without a key dance.
 */
function HistoryList({
  activeConversationId,
  onSelect,
}: {
  activeConversationId: string;
  onSelect: (summary: ConversationSummary) => void;
}) {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listConversations().then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        Loading…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
        <p className="text-sm font-medium text-foreground">No past conversations</p>
        <p className="text-xs text-muted">
          Chats with Koji are saved per lesson — they'll show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
      {items.map((item) => (
        <li key={item.conversationId}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            aria-current={
              item.conversationId === activeConversationId ? "true" : undefined
            }
            className={cn(
              "flex w-full flex-col gap-0.5 rounded-2xl px-3 py-2.5 text-left outline-none transition-colors",
              "hover:bg-default/40 focus-visible:ring-2 focus-visible:ring-accent",
              item.conversationId === activeConversationId && "bg-default/25",
            )}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {item.lessonTitle}
              </span>
              <span className="shrink-0 text-[0.7rem] text-muted">
                {relativeTime(item.updatedAtMs)}
              </span>
            </span>
            <span className="line-clamp-2 text-xs text-muted">
              {item.lastRole === "user" ? "You: " : "Koji: "}
              {item.lastMessage}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
