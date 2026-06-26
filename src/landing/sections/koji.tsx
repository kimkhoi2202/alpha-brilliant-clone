import { Button, Callout, Chip } from "../../components/ui";
import { RivePlayer } from "../../components/visuals";
import { ASK_KOJI_RIV } from "../../lib/rive-runtime";
import { Eyebrow, LandingSection } from "../ui/section";

/**
 * "Meet Koji" — the AI-tutor section, built inside the real app skin from the
 * app's own parts: the actual `< >` Koji (the in-lesson `RivePlayer`, same state
 * machine + view-model binding as `ask-koji.tsx`) beside a static snapshot of the
 * tutor thread, composed only from the real `Callout` / `Chip` / `Button`
 * components and mirroring `koji-panel.tsx`'s sheet layout (header → log → voice
 * → effort-gated reveal). Nothing here is hand-rolled chrome.
 */
export function KojiTutor() {
  return (
    <LandingSection id="koji" width="wide">
      <header className="flex max-w-2xl flex-col items-start gap-5">
        <Eyebrow>Meet Koji</Eyebrow>

        <h2 className="text-balance text-[clamp(1.9rem,4vw,2.75rem)] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
          Your tutor, <span className="text-[var(--accent)]">right in the lesson</span>.
        </h2>

        <p className="max-w-[40rem] text-pretty text-lg leading-relaxed text-muted">
          Koji is the friendly{" "}
          <span className="font-mono font-semibold text-foreground">{"< >"}</span> in the
          corner of every lesson. Ask for a hint and you get a nudge toward your next move,
          never the answer. Ask why something was wrong and Koji names the exact slip, like
          adding the legs instead of squaring them. The worked solution unlocks only after a
          real attempt, and you can work it all by text or by voice.
        </p>
      </header>

      <div className="mt-12 grid items-center gap-10 sm:mt-16 lg:grid-cols-2 lg:gap-16">
        <KojiStage />
        <KojiThread />
      </div>
    </LandingSection>
  );
}

/**
 * The real Koji character on a soft accent stage. The canvas carries no meaning
 * on its own (it's the same dormant mascot the lesson renders), so the visual is
 * `aria-hidden` and the honest "optional" line below it does the talking.
 */
function KojiStage() {
  return (
    <div className="flex flex-col items-center gap-7 lg:items-start">
      <div className="relative grid w-full place-items-center py-4" aria-hidden>
        <div
          className="pointer-events-none absolute size-72 max-w-full rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 24%, transparent), transparent 78%)",
          }}
        />
        <RivePlayer
          src={ASK_KOJI_RIV}
          stateMachines="AskKoji"
          autoBind
          viewModelBooleans={{ bracketsOn: true }}
          className="size-48"
        />
      </div>

      <p className="max-w-sm text-pretty text-center text-sm leading-relaxed text-muted lg:text-left">
        Koji is optional. With the tutor switched off, every lesson still teaches from start
        to finish, with hand-written hints and instant feedback.
      </p>
    </div>
  );
}

/**
 * A static snapshot of the in-lesson tutor thread, composed only from real UI
 * primitives and mirroring `koji-panel.tsx`: the `< >` header, a grounded hint
 * (real `Callout`) labelled by the layered-hint `Chip`s, the voice channel, and
 * the effort-gated reveal `Button` with the panel's own locked helper copy.
 */
function KojiThread() {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-3xl border border-border bg-[var(--surface)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.7)]">
        {/* Header — mirrors the panel's Koji identity row. */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-sm font-bold text-accent-soft-foreground"
          >
            {"< >"}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">Koji</p>
            <p className="truncate text-xs text-muted">Your study buddy</p>
          </div>
          <Chip size="sm" intent="neutral" className="ml-auto shrink-0">
            Find the Hypotenuse
          </Chip>
        </div>

        {/* Log — Koji's grounded nudge, layered and spoiler-free. */}
        <div className="flex flex-col gap-3 px-4 py-4">
          <p className="text-sm leading-relaxed text-muted">
            Stuck on c? Ask for a hint and I&apos;ll point you at the next step. No spoilers.
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>

          <Callout intent="info">
            Square each leg on its own first. What do you get for 3&#178; and 4&#178;? Add
            those two before you go looking for c.
          </Callout>
        </div>

        {/* Voice — same tap-to-talk / hands-free / transcript surface as the panel. */}
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
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
        </div>

        {/* Reveal — the effort-gated CTA in its locked state (the panel's copy). */}
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
          <Button size="sm" variant="warning" className="min-h-11" isDisabled>
            Reveal the answer
          </Button>
          <p className="text-xs leading-relaxed text-muted">
            Give it a real try and ask for a hint first. Then I can reveal the worked answer
            and walk you through your specific gap.
          </p>
        </div>
      </div>

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
        Every hint and reveal is checked by our own math engine before you see it.
      </p>
    </div>
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
