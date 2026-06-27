/**
 * `useChatScroll` — the chat-thread scroller (shadcn `MessageScroller` behavior,
 * rebuilt in our own stack; no shadcn install).
 *
 * It replaces the old "scrollTo(bottom) on every update" (which yanked the
 * learner down mid-read) with three coordinated behaviors:
 *
 *  1. **Stick-to-bottom (auto-pin):** while the learner is already at/near the
 *     bottom, the view stays pinned to the newest content as Koji streams. The
 *     moment they scroll up, auto-pin backs off and their position is preserved —
 *     we never scroll them down against their will.
 *
 *  2. **Turn anchoring:** when a NEW user turn is added, it's anchored near the
 *     TOP of the viewport (with a small peek of the previous exchange above) so
 *     Koji's reply streams in BELOW it — instead of snapping to the document
 *     bottom and making the whole thread jump. A bottom spacer is reserved so the
 *     just-sent turn (the last item) CAN sit at the top before any reply exists;
 *     it shrinks to nothing as the reply fills the space (ChatGPT-style).
 *
 *  3. **Jump-to-latest:** `isAtBottom` is false exactly when there's unseen
 *     content below, so the surface can show a "jump to latest" affordance only
 *     then; `scrollToLatest` returns to the newest message and re-engages pinning.
 *
 * Mechanics: a scroll listener tracks distance-from-bottom against a threshold; a
 * `ResizeObserver` on both the viewport and the content list pins while at-bottom
 * (or maintains the anchor spacer while anchored); a layout effect on the message
 * list drives the anchor/pin when turns are appended. All scrolling honors
 * `prefers-reduced-motion` (instant instead of smooth) via the `reduceMotion` arg.
 *
 * The hook is DOM-only (no SDK/voice knowledge) and lives in a `.ts` module so the
 * `.tsx` chat surface keeps exporting only components (React Fast Refresh).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/** Within this many px of the bottom counts as "at the bottom" (pin engaged). */
const AT_BOTTOM_THRESHOLD_PX = 72;
/** How much of the previous exchange peeks above an anchored new user turn. */
const TURN_ANCHOR_PEEK_PX = 48;

/** The minimal shape the scroller needs per rendered turn (id + who spoke). */
export interface ChatScrollItem {
  id: string;
  role: "user" | "assistant";
}

export interface UseChatScroll {
  /** Attach to the scrolling viewport (`overflow-y-auto`). */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Attach to the inner message-list wrapper (observed for streaming growth). */
  contentRef: RefObject<HTMLDivElement | null>;
  /** Attach to an empty trailing element used to reserve turn-anchor space. */
  spacerRef: RefObject<HTMLDivElement | null>;
  /** False exactly when there's unseen content below (drives the jump button). */
  isAtBottom: boolean;
  /** Scroll to the newest message and re-engage auto-pin (the jump button). */
  scrollToLatest: () => void;
}

/**
 * @param items        the VISIBLE turns, in order (used to detect new turns and
 *                     to find the element to anchor — each must render
 *                     `data-mid={id}`).
 * @param reduceMotion when true, every programmatic scroll is instant.
 */
export function useChatScroll(
  items: ChatScrollItem[],
  reduceMotion: boolean,
): UseChatScroll {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const spacerRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const atBottomRef = useRef(true);

  // Id of the user turn currently anchored near the top (null = not anchored).
  const anchorIdRef = useRef<string | null>(null);
  // First layout pass jumps straight to the bottom (show the latest on open).
  const initializedRef = useRef(false);
  const prevCountRef = useRef(0);
  // Read inside long-lived observers without re-subscribing on every change.
  const reduceRef = useRef(reduceMotion);
  useEffect(() => {
    reduceRef.current = reduceMotion;
  }, [reduceMotion]);

  const distanceFromBottom = useCallback((): number => {
    const el = scrollRef.current;
    if (!el) return 0;
    return el.scrollHeight - el.scrollTop - el.clientHeight;
  }, []);

  const setAtBottom = useCallback((value: boolean) => {
    atBottomRef.current = value;
    setIsAtBottom((prev) => (prev === value ? prev : value));
  }, []);

  const clearAnchor = useCallback(() => {
    anchorIdRef.current = null;
    const spacer = spacerRef.current;
    if (spacer && spacer.style.height !== "0px") spacer.style.height = "0px";
  }, []);

  // Reserve the bottom spacer so the anchored user turn can sit near the top, and
  // (optionally) scroll it there. Called once when a turn is anchored (scroll =
  // true) and again on each content resize to keep the reservation correct as the
  // reply streams in (scroll = false → position holds on its own). DOM-only: it
  // never calls setState — `isAtBottom` is refreshed by the scroll listener (a
  // programmatic scroll fires a scroll event) and the ResizeObserver below.
  const applyAnchor = useCallback((id: string, scroll: boolean) => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !content) return;

    const anchorEl = content.querySelector<HTMLElement>(
      `[data-mid="${CSS.escape(id)}"]`,
    );
    if (!anchorEl) return;

    // Record the active anchor the moment one is established (the scroll === true
    // call). `anchorIdRef` was declared, cleared, and READ by the ResizeObserver
    // maintenance branch and the scroll listener's at-bottom auto-clear, but was
    // never assigned — so both were dead code: the reserved spacer never shrank
    // as Koji's reply streamed in (a persistent empty gap) and the anchor never
    // auto-cleared (the jump-to-latest button could stay stuck). Maintenance
    // passes (scroll === false) must NOT re-anchor a turn the learner scrolled
    // past, so this is gated on `scroll`.
    if (scroll) anchorIdRef.current = id;

    const containerH = scroller.clientHeight;
    const anchorTop =
      anchorEl.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop;
    const desiredTop = Math.max(0, anchorTop - TURN_ANCHOR_PEEK_PX);

    const currentSpacer = spacer ? spacer.offsetHeight : 0;
    const naturalScrollHeight = scroller.scrollHeight - currentSpacer;
    // Enough trailing space that `desiredTop` is a reachable scroll position
    // (a full viewport below the anchor), capped so the gap never gets absurd.
    let reserve = Math.max(0, desiredTop + containerH - naturalScrollHeight);
    reserve = Math.min(reserve, containerH);
    if (spacer && Math.abs(reserve - currentSpacer) > 1) {
      spacer.style.height = `${reserve}px`;
    }

    if (scroll) {
      const maxScroll = Math.max(0, scroller.scrollHeight - containerH);
      scroller.scrollTop = Math.min(desiredTop, maxScroll);
    }
  }, []);

  const scrollToLatest = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Drop any reserved anchor space, then go to the true bottom + re-engage pin.
    clearAnchor();
    el.scrollTo({
      top: el.scrollHeight,
      behavior: reduceRef.current ? "auto" : "smooth",
    });
    setAtBottom(true);
  }, [clearAnchor, setAtBottom]);

  // Track the learner's position. Reaching the genuine bottom (with the anchor
  // reservation already depleted) re-engages following and drops the anchor.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const atBottom = distanceFromBottom() <= AT_BOTTOM_THRESHOLD_PX;
        setAtBottom(atBottom);
        const spacerH = spacerRef.current?.offsetHeight ?? 0;
        if (atBottom && anchorIdRef.current && spacerH <= 1) clearAnchor();
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [distanceFromBottom, setAtBottom, clearAnchor]);

  // Pin (or maintain the anchor) as content grows — Koji streaming tokens into a
  // bubble resizes the list; the panel morph / keyboard resizes the viewport.
  useEffect(() => {
    const scroller = scrollRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    let raf = 0;
    const react = () => {
      raf = 0;
      const el = scrollRef.current;
      if (!el) return;
      if (anchorIdRef.current) {
        applyAnchor(anchorIdRef.current, false);
      } else if (atBottomRef.current) {
        el.scrollTop = el.scrollHeight; // instant pin (smooth-per-token = jank)
      }
      // Deferred (rAF) setState — refresh whether the jump button should show.
      setAtBottom(distanceFromBottom() <= AT_BOTTOM_THRESHOLD_PX);
    };
    const observer = new ResizeObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(react);
    });
    observer.observe(scroller);
    observer.observe(content);
    return () => {
      observer.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [applyAnchor, distanceFromBottom, setAtBottom]);

  // React to appended turns: first pass jumps to the bottom; a new USER turn gets
  // anchored near the top; any other new turn pins only if we were following.
  // DOM-only — each programmatic scroll fires a scroll event, so the scroll
  // listener (and the ResizeObserver) refresh `isAtBottom` without a synchronous
  // setState in this layout effect.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const count = items.length;
    const last = count > 0 ? items[count - 1] : null;

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCountRef.current = count;
      if (count > 0) el.scrollTop = el.scrollHeight; // open at the latest
      return;
    }

    const appended = count > prevCountRef.current;
    prevCountRef.current = count;
    if (!appended || !last) return;

    if (last.role === "user") {
      applyAnchor(last.id, true);
    } else if (atBottomRef.current && !anchorIdRef.current) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: reduceRef.current ? "auto" : "smooth",
      });
    }
    // While anchored, a new assistant turn streams in below the anchor (the
    // ResizeObserver maintains the reservation) — we deliberately don't pin.
  }, [items, applyAnchor]);

  return { scrollRef, contentRef, spacerRef, isAtBottom, scrollToLatest };
}
