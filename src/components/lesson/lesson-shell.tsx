import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode, RefObject } from "react";

import { cn } from "../../lib/cn";
import { LessonTopBar } from "../chrome";
import { AskKoji, type KojiHandle } from "./ask-koji";
import type { FeedbackToastLayout } from "./feedback-toast";
import { LessonCalculator } from "./lesson-calculator";

/**
 * Koji renders at `size-40` (10rem ≈ 160px). A callout wider than this footprint
 * is "bigger than Koji", so it drops the cute bubble for the roomy banner.
 */
const KOJI_FOOTPRINT_PX = 160;

export interface LessonShellProps {
  /** 0–100 progress. */
  progress: number;
  onClose?: () => void;
  /** Trailing stat in the top bar (e.g. an energy <Counter />). */
  energy?: ReactNode;
  checkpoints?: number;
  /** Brilliant's success state: the frame edge greens and a soft green glow
   *  rises from the bottom. Only on a correct answer, never on wrong/reveal. */
  correct?: boolean;
  /** Small feedback toast (<FeedbackToast/>) shown bottom-left above the footer. */
  toast?: ReactNode;
  /** Lesson content (prompt + figure / choices). */
  children: ReactNode;
  /** Bottom row inside the lesson frame: a <FooterCtaBar> (Check, Continue, etc.). */
  footer: ReactNode;
  /** Swoop Koji in on his first appearance (true only for map launches). */
  kojiSwoop?: boolean;
  /** Receives Koji's reaction handle so the runner can react to grading. */
  kojiRef?: RefObject<KojiHandle | null>;
  className?: string;
}

/**
 * Full lesson player frame: top bar + bordered lesson stage.
 *
 * The bordered stage fills the available viewport area and owns both the lesson
 * content and the bottom action row, matching Brilliant's full-screen lesson
 * canvas.
 */
export function LessonShell({
  progress,
  onClose,
  energy,
  checkpoints,
  correct = false,
  toast,
  children,
  footer,
  kojiSwoop = false,
  kojiRef,
  className,
}: LessonShellProps) {
  // The callout adapts to its content: a compact bubble centered over Koji for
  // short feedback, or a roomy, left-aligned banner when the content (e.g. long
  // KaTeX math) is wider than Koji's footprint. We measure the rendered pill
  // rather than guess from string length, so it stays correct as fonts/KaTeX
  // load and across messages.
  const toastMeasureRef = useRef<HTMLDivElement>(null);
  const [roomy, setRoomy] = useState(false);

  const measureLayout = useCallback(() => {
    const el = toastMeasureRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    // Ignore the zero-width frame before first layout.
    if (width > 0) setRoomy(width > KOJI_FOOTPRINT_PX);
  }, []);

  // Decide the layout before paint (no flicker between bubble and banner), then
  // keep watching: a ResizeObserver catches reflows and `fonts.ready` catches
  // KaTeX swapping in its own glyphs after first paint. Measuring on a transform-
  // centered element keeps the width independent of the chosen layout, so the
  // compact/roomy decision can't oscillate.
  useLayoutEffect(() => {
    const el = toastMeasureRef.current;
    if (!el) return;
    measureLayout();
    const observer = new ResizeObserver(() => measureLayout());
    observer.observe(el);
    let cancelled = false;
    document.fonts?.ready
      .then(() => {
        if (!cancelled) measureLayout();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [toast, measureLayout]);

  const layout: FeedbackToastLayout = roomy ? "roomy" : "compact";
  const renderedToast = isValidElement(toast)
    ? cloneElement(toast as ReactElement<{ layout?: FeedbackToastLayout }>, {
        layout,
      })
    : toast;

  return (
    <div
      className={cn(
        // Lock the player to the viewport so the frame/border is always the same
        // size and the page never scrolls, only the inner content area does
        // (so zoomed-in content adapts and scrolls within the frame).
        "relative flex h-svh flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <LessonTopBar
        progress={progress}
        onClose={onClose}
        endContent={energy}
        checkpoints={checkpoints}
      />
      <main className="flex min-h-0 flex-1 px-3 pb-3 pt-3 sm:px-6 sm:pb-6 md:px-10 md:pb-8 md:pt-4 xl:px-12">
        <div
          className={cn(
            "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border-2 transition-colors duration-300 sm:rounded-[28px]",
            correct
              ? "border-success"
              : "border-[color:var(--lesson-frame)]",
          )}
        >
          {/* Brilliant's success glow: a soft green wash rising from the bottom. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-1/2 transition-opacity duration-500",
              correct ? "opacity-100" : "opacity-0",
            )}
            style={{
              background:
                "radial-gradient(ellipse at bottom, rgba(94,217,129,0.22), transparent 68%)",
            }}
          />
          {/* Scroll container: `m-auto` on the inner wrapper centers the content
              when it fits, but lets it scroll fully (no clipped top) when it
              overflows, e.g. zoomed in or on short viewports. */}
          <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-4 py-6 sm:py-8">
            <div className="m-auto w-full max-w-3xl">{children}</div>
          </div>
          {/* Footer owns the toast for vertical placement (just above the CTA
              row). Both layouts share the bottom-left anchor at Koji's left edge
              and grow upward; horizontally the compact bubble is centered over
              Koji (transform), while the roomy banner stays left-aligned so its
              prefix is never clipped off the frame's left edge. */}
          <div className="relative z-10 shrink-0">
            {toast ? (
              <CalloutReveal className="pointer-events-none absolute bottom-full left-1 z-50 mb-12 lg:left-2">
                {/* Re-enable pointer events on the toast itself so its text is
                    selectable, while the wrapper stays non-blocking. The compact
                    bubble centers over Koji via a transform (80px = half of his
                    size-40). */}
                <div
                  ref={toastMeasureRef}
                  className={cn(
                    "pointer-events-auto w-fit",
                    !roomy && "translate-x-[calc(80px_-_50%)]",
                  )}
                >
                  {renderedToast}
                </div>
              </CalloutReveal>
            ) : null}
            {footer}
          </div>

          {/* Brilliant's in-lesson mascot, pinned bottom-left of the stage. */}
          <AskKoji swoop={kojiSwoop} handleRef={kojiRef} />

          {/* Pop-up calculator, pinned bottom-right to mirror the mascot. */}
          <LessonCalculator />
        </div>
      </main>
    </div>
  );
}

/**
 * Subtle enter for the callout (fade + slight rise). It mounts/unmounts with the
 * toast, so the animation re-arms on every appearance. Honors reduced motion by
 * appearing instantly (no transform / opacity ramp).
 */
function CalloutReveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div
      className={cn(
        className,
        "transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none",
        entered
          ? "translate-y-0 opacity-100"
          : "translate-y-1 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
      )}
    >
      {children}
    </div>
  );
}
