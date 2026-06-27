import { useNavigate } from "@tanstack/react-router";

import { Button } from "../../components/ui";
import { Meteors } from "../../components/ui/meteors";
import { LandingSection, SectionHeading } from "../ui/section";
import { scrollToId } from "../ui/scroll-to-id";

/**
 * Final CTA — the page's climax. A self-contained, accent-lit band (set apart
 * from the flat sections above) that closes on a single decision: start.
 * Composes the app's real `Button` (the brand `accent` "Start") so reaching the
 * end of the page feels like finishing a lesson. Nothing here is hand-rolled
 * chrome.
 */
export function FinalCTA() {
  const navigate = useNavigate();

  return (
    <LandingSection id="start">
      <div className="relative isolate overflow-hidden rounded-3xl border-2 border-border bg-[var(--surface)] px-6 py-16 text-center shadow-[0_30px_90px_-50px_rgba(0,0,0,0.8)] sm:px-12 sm:py-20">
        {/* Decorative meteor shower, clipped to the card by the container's
            `overflow-hidden`. Sits behind the content (-z-10). */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <Meteors number={20} />
        </div>

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
