import { motion, type Variants } from "motion/react";

import { KojiMascot } from "../../components/lesson/koji";
import { Button, Callout, Chip } from "../../components/ui";
import { duration, easing, useMotionEnabled, viewportOnce } from "../motion";
import { LandingSection, SectionHeading } from "../ui/section";

/**
 * "Meet Koji" — the AI-tutor section, built inside the real app skin from the
 * app's own parts: the animated `KojiMascot` (the same `ask_koji.riv` state
 * machine + view-model binding the lesson uses via `ask-koji.tsx`) beside a
 * static snapshot of the tutor thread, composed only from the real `Callout` /
 * `Chip` / `Button` components and mirroring `koji-panel.tsx`'s sheet layout
 * (header → log → voice → effort-gated reveal). Nothing here is hand-rolled chrome.
 */
export function KojiTutor() {
  return (
    <LandingSection id="koji" width="wide">
      <SectionHeading
        title={
          <>
            Your tutor, <span className="text-[var(--accent)]">right in the lesson</span>.
          </>
        }
        description="Koji is the friendly tutor in the corner of every lesson. Ask for a hint and you get a nudge toward your next move, never the answer. Ask why something was wrong and Koji names the exact slip, like adding the legs instead of squaring them. The worked solution unlocks only after a real attempt, and you can work it all by text or by voice."
      />

      <div className="mt-12 grid items-center gap-10 sm:mt-16 lg:grid-cols-2 lg:gap-16">
        <KojiStage />
        <KojiThread />
      </div>
    </LandingSection>
  );
}

/**
 * The real Koji character on a soft accent stage. The mascot is decorative — the
 * same animated character the lesson renders, just dropped in place — so the
 * visual is `aria-hidden` and the honest "optional" line below it does the talking.
 *
 * The accent glow behind Koji breathes — a slow, low-amplitude opacity/scale
 * pulse (ease-in-out, ~3.6s loop) that gives the stage a sense of life without
 * touching the Rive mascot, which owns its own entrance + idle loop. The breathe
 * runs only while in view and only when motion is enabled; reduced motion holds
 * the glow at its resting state.
 */
function KojiStage() {
  const enabled = useMotionEnabled();

  return (
    <div className="flex flex-col items-center gap-7">
      <div className="relative grid w-full place-items-center py-4" aria-hidden>
        <motion.div
          className="pointer-events-none absolute size-96 max-w-full rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 24%, transparent), transparent 78%)",
            willChange: enabled ? "opacity, transform" : undefined,
          }}
          initial={enabled ? { opacity: 0.82, scale: 1 } : false}
          whileInView={
            enabled ? { opacity: [0.82, 1, 0.82], scale: [1, 1.05, 1] } : undefined
          }
          viewport={{ once: false, amount: 0.2 }}
          transition={
            enabled
              ? { duration: 3.6, ease: easing.inOut, repeat: Infinity }
              : undefined
          }
        />
        <KojiMascot className="size-64" />
      </div>

      <p className="mx-auto max-w-md text-pretty text-center text-base leading-relaxed text-foreground/80">
        Koji is optional. With the tutor switched off, every lesson still teaches from start
        to finish, with hand-written hints and instant feedback.
      </p>
    </div>
  );
}

// Conversational unfold: the thread's rows arrive top-to-bottom like a chat
// (header → nudge → hint chips → callout → voice → reveal → footnote). Explicit
// per-row delays (not staggerChildren) keep the sequence ordered across the
// card's two nesting levels; the whole cascade lands well under 0.8s.
const ROW_BASE_DELAY = 0.06;
const ROW_STAGGER = 0.06;

// The outer wrapper is a pure orchestrator: it flips its descendants from
// "hidden" to "shown" once, when the thread scrolls into view.
const threadContainer: Variants = {
  hidden: {},
  shown: {},
};

// The card panel itself rises + fades as the surface the messages arrive into.
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: easing.out },
  },
};

// Each row settles in like a chat bubble; `custom` is its place in the thread,
// which sets its delay so rows arrive in sequence rather than all at once.
const rowVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.base,
      ease: easing.out,
      delay: ROW_BASE_DELAY + i * ROW_STAGGER,
    },
  }),
};

/**
 * A static snapshot of the in-lesson tutor thread, composed only from real UI
 * primitives and mirroring `koji-panel.tsx`: the Koji identity header, a grounded
 * hint (real `Callout`) labelled by the layered-hint `Chip`s, the voice channel,
 * and the effort-gated reveal `Button` with the panel's own locked helper copy.
 */
function KojiThread() {
  const enabled = useMotionEnabled();
  // Per-row entrance props. Empty when motion is off, so rows render at their
  // final, visible state (no transform) — the reduced-motion / `?motion=off` path.
  const row = (i: number) => (enabled ? { variants: rowVariants, custom: i } : {});

  return (
    <motion.div
      className="mx-auto w-full max-w-md"
      initial={enabled ? "hidden" : false}
      whileInView={enabled ? "shown" : undefined}
      viewport={viewportOnce}
      variants={enabled ? threadContainer : undefined}
    >
      <motion.div
        className="overflow-hidden rounded-2xl border-2 border-border bg-[var(--surface)]"
        variants={enabled ? cardVariants : undefined}
      >
        {/* Header — mirrors the panel's Koji identity row. */}
        <motion.div
          className="flex items-center gap-3 border-b border-border px-4 py-3"
          {...row(0)}
        >
          <KojiMascot className="size-9 shrink-0" loop={false} />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">Koji</p>
            <p className="truncate text-xs text-muted">Your study buddy</p>
          </div>
          <Chip size="sm" intent="neutral" className="ml-auto shrink-0">
            Find the Hypotenuse
          </Chip>
        </motion.div>

        {/* Log — Koji's grounded nudge, layered and spoiler-free. */}
        <div className="flex flex-col gap-3 px-4 py-4">
          <motion.p className="text-sm leading-relaxed text-muted" {...row(1)}>
            Stuck on c? Ask for a hint and I&apos;ll point you at the next step. No spoilers.
          </motion.p>

          <motion.div className="flex flex-wrap items-center gap-1.5" {...row(2)}>
            <span className="mr-1 text-[0.7rem] font-bold uppercase tracking-wider text-muted">
              Layered hints
            </span>
            <Chip size="sm" intent="accent">
              Hint 1
            </Chip>
            <Chip size="sm" intent="neutral">
              Hint 2
            </Chip>
            <Chip size="sm" intent="neutral">
              Hint 3
            </Chip>
          </motion.div>

          <motion.div {...row(3)}>
            <Callout intent="info">
              Square each leg on its own first. What do you get for 3&#178; and 4&#178;? Add
              those two before you go looking for c.
            </Callout>
          </motion.div>
        </div>

        {/* Voice — same tap-to-talk / hands-free / transcript surface as the panel. */}
        <motion.div
          className="flex flex-col gap-2 border-t border-border px-4 py-3"
          {...row(4)}
        >
          <p className="text-xs font-medium leading-relaxed text-muted">
            Rather talk it through? Tap to talk or go hands-free, with a live transcript.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" intent="accent" startContent={<MicGlyph />}>
              Tap to talk
            </Chip>
            <Chip size="sm" intent="neutral">
              Hands-free
            </Chip>
          </div>
        </motion.div>

        {/* Reveal — the effort-gated CTA in its locked state (the panel's copy). */}
        <motion.div
          className="flex flex-col gap-2 border-t border-border px-4 py-3"
          {...row(5)}
        >
          <Button size="sm" variant="warning" className="min-h-11" isDisabled>
            Reveal the answer
          </Button>
          <p className="text-xs leading-relaxed text-muted">
            Give it a real try and ask for a hint first. Then I can reveal the worked answer
            and walk you through your specific gap.
          </p>
        </motion.div>
      </motion.div>

      <motion.p className="mt-3 px-1 text-xs leading-relaxed text-muted" {...row(6)}>
        Every hint and reveal is checked by our own math engine before you see it.
      </motion.p>
    </motion.div>
  );
}

/** Small mic glyph for the voice chip (decorative; the chip label names it). */
function MicGlyph() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-3.5">
      <path
        fill="currentColor"
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M6 11a6 6 0 0 0 12 0M12 17v3"
      />
    </svg>
  );
}
