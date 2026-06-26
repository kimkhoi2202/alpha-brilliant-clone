import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";

import { ConfettiBurst } from "../../components/celebration/confetti-burst";
import { Button } from "../../components/ui";
import { CtaConfettiStatic } from "../graphics/cta-confetti-static";
import { LandingSection, SectionHeading, scrollToId } from "../ui/section";

/** Respect the OS "reduce motion" setting; updates live if the user toggles it. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * True once `ref` first scrolls into view, then latched. Fires the celebration
 * the moment the closing band is reached (not on page load, so the burst lands
 * as the visitor arrives), and never replays.
 */
function useInViewOnce<T extends Element>(
  ref: RefObject<T | null>,
  amount: number,
): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setSeen(true);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold: amount },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, amount, seen]);

  return seen;
}

/**
 * Final CTA — the page's climax. A self-contained, accent-lit band (set apart
 * from the flat sections above) that closes on a single decision: start.
 * Composes the app's real `Button` (the brand `accent` "Start") and its real
 * `ConfettiBurst` — the very celebration shown on lesson complete — so reaching
 * the end of the page feels like finishing a lesson. The burst plays once as the
 * band scrolls in; under `prefers-reduced-motion` it's swapped for a static
 * burst of unit squares (the theorem's own a2 + b2 = c2 motif) so the
 * celebration still reads. Nothing here is hand-rolled chrome.
 */
export function FinalCTA() {
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();
  const bandRef = useRef<HTMLDivElement | null>(null);
  // Low threshold so the burst still fires when the band is taller than a short
  // (e.g. landscape phone) viewport and can never be mostly on-screen at once.
  const reached = useInViewOnce(bandRef, 0.25);

  return (
    <LandingSection id="start">
      <div
        ref={bandRef}
        className="relative isolate overflow-hidden rounded-3xl border-2 border-border bg-[var(--surface)] px-6 py-16 text-center shadow-[0_30px_90px_-50px_rgba(0,0,0,0.8)] sm:px-12 sm:py-20"
      >
        {/* Ambient brand wash, concentrated at the top edge so the headline keeps
            full contrast on the near-plain surface below it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20"
          style={{
            background:
              "radial-gradient(62% 52% at 50% 0%, color-mix(in oklab, var(--accent) 20%, transparent), transparent 70%)",
          }}
        />

        {/* The celebration: real Rive confetti when motion is allowed, a static
            unit-square burst otherwise. Both sit behind the content and are
            clipped to the band. */}
        {reducedMotion ? (
          <CtaConfettiStatic className="absolute inset-0 -z-10" />
        ) : reached ? (
          <ConfettiBurst className="absolute inset-0 -z-10" />
        ) : null}

        <div className="mx-auto flex max-w-2xl flex-col items-center">
          <SectionHeading
            title={
              <>
                Ready to make it{" "}
                <span className="text-[var(--accent)]">click</span>?
              </>
            }
            description="Start with one triangle. The rest of the theorem follows."
          />

          <div className="mt-9 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:justify-center">
            <Button
              variant="accent"
              size="lg"
              className="w-full sm:w-auto"
              onPress={() => void navigate({ to: "/auth" })}
            >
              Start learning, free
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onPress={() => scrollToId("koji")}
            >
              Meet Koji
            </Button>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted">
            <span
              aria-hidden
              className="grid size-4 place-items-center rounded-full"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--accent) 22%, transparent)",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4 10-10"
                  stroke="var(--accent)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Free to start. No card required.
          </p>
        </div>
      </div>
    </LandingSection>
  );
}
