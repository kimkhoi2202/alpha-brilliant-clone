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
  /** AI-only Koji popup, rendered INSIDE the lesson frame so it lines up with the
   *  border (like the calculator) instead of floating against the viewport. */
  koji?: ReactNode;
  /**
   * Whether the Koji panel is currently open. Drives the feedback callout's
   * position: closed → it sits bottom-left over the mascot (the default); open →
   * it slides to the center of the content column (in the gap above the CTA) so
   * it never hides under the left-docked panel. Defaults to closed.
   */
  panelOpen?: boolean;
  /** Swoop Koji in on his first appearance (true only for map launches). */
  kojiSwoop?: boolean;
  /** Receives Koji's reaction handle so the runner can react to grading. */
  kojiRef?: RefObject<KojiHandle | null>;
  /**
   * Light Koji up as a tappable "Ask Koji" entry point (Phase 2, AI on). Off by
   * default, so with AI off the mascot stays the dormant Phase 1 decoration.
   */
  kojiInteractive?: boolean;
  /** Tapped the "Ask Koji" affordance (only when `kojiInteractive`). */
  onAskKoji?: () => void;
  /** Step back to review an already-completed step (top-bar back chevron). */
  onBack?: () => void;
  /** Step forward through already-reached steps (top-bar forward chevron). */
  onForward?: () => void;
  /** Whether an earlier step exists to go back to. */
  canGoBack?: boolean;
  /** Whether an already-reached forward step exists to advance to. */
  canGoForward?: boolean;
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
  koji,
  panelOpen = false,
  kojiSwoop = false,
  kojiRef,
  kojiInteractive = false,
  onAskKoji,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false,
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
        onBack={onBack}
        onForward={onForward}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
      />
      <main className="flex min-h-0 flex-1 px-3 pb-3 pt-3 sm:px-6 sm:pb-6 md:px-10 md:pb-8 md:pt-4 xl:px-12">
        <h1 className="sr-only">Lesson</h1>
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
              row). It always grows upward from just above the CTA; horizontally
              its anchor depends on the Koji panel. CLOSED: bottom-left at Koji's
              edge — the compact bubble centers over Koji (transform), the roomy
              banner stays left-aligned so its prefix is never clipped. OPEN: it
              slides to the center of the content column so it never sits under the
              left-docked panel. The positioner animates `left` between the two; the
              inner element animates its own horizontal transform, so the slide is
              smooth (and instant under reduced motion). */}
          <div className="relative z-10 shrink-0">
            {toast ? (
              <div
                className={cn(
                  "pointer-events-none absolute bottom-full z-50 mb-12",
                  "transition-[left] duration-300 ease-out motion-reduce:transition-none",
                  panelOpen ? "left-1/2" : "left-1 lg:left-2",
                )}
              >
                <CalloutReveal>
                  {/* Re-enable pointer events on the toast itself so its text is
                      selectable, while the wrapper stays non-blocking. Horizontal
                      placement lives here: open → centered on the positioner's
                      left-1/2 anchor; closed compact → centered over Koji (80px =
                      half of his size-40); closed roomy → left-aligned. */}
                  <div
                    ref={toastMeasureRef}
                    className={cn(
                      "pointer-events-auto w-fit",
                      "transition-transform duration-300 ease-out motion-reduce:transition-none",
                      panelOpen
                        ? "-translate-x-1/2"
                        : !roomy
                          ? "translate-x-[calc(80px_-_50%)]"
                          : undefined,
                    )}
                  >
                    {renderedToast}
                  </div>
                </CalloutReveal>
              </div>
            ) : null}
            {footer}
          </div>

          {/* Brilliant's in-lesson mascot (Koji), pinned bottom-left of the
              stage. Only mounts when AI is on. AI is always-on for real users;
              the AI-off fallback (the graded "teaches with AI off" path) shows
              no mascot, since Koji is the AI tutor's avatar. */}
          {kojiInteractive ? (
            <AskKoji
              swoop={kojiSwoop}
              handleRef={kojiRef}
              interactive={kojiInteractive}
              onAsk={onAskKoji}
            />
          ) : null}

          {/* Pop-up calculator, pinned bottom-right to mirror the mascot. */}
          <LessonCalculator />

          {/* AI Koji popup — mounted inside the frame (not the viewport) so it
              lines up with the lesson border, like the calculator. */}
          {koji}
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
