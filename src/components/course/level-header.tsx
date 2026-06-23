import { useState } from "react";

import { cn } from "../../lib/cn";
import { Button, Modal } from "../ui";

export interface LevelHeaderProps {
  level: string | number;
  title: string;
  /** Learning objectives — when present, the banner becomes a "view details"
   *  button that opens a dialog (Brilliant's pattern). */
  objectives?: string[];
  /** When every lesson in the level is done, surface a destructive reset action
   *  at the bottom of the dialog. */
  allCompleted?: boolean;
  /** Wipes lesson progress (only surfaced when `allCompleted`). */
  onReset?: () => void;
  className?: string;
}

/* Brilliant's level banner: a full-width, accent-bordered card with the level
 * eyebrow + title. Shared look for the static + interactive forms (the latter is
 * a real <Button>, so press/hover/focus all come from the button logic — no
 * bespoke "lift" on hover). */
const BANNER_LOOK =
  "rounded-2xl border-2 border-accent bg-accent/[0.06] px-6 py-3.5 text-center";

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="size-5"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function LevelEyebrow({ level }: { level: string | number }) {
  return (
    <span className="block text-xs font-bold uppercase tracking-wider text-accent">
      Level {level}
    </span>
  );
}

/** The "LEVEL 1 / Pythagoras" banner atop a course-map section. With
 *  `objectives` it's a button that opens the level-details dialog. */
export function LevelHeader({
  level,
  title,
  objectives,
  allCompleted,
  onReset,
  className,
}: LevelHeaderProps) {
  const [open, setOpen] = useState(false);
  // Reset wipes every lesson, so require a second tap to confirm.
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  const inner = (
    <>
      <LevelEyebrow level={level} />
      <span className="mt-0.5 block text-lg font-bold text-foreground">
        {title}
      </span>
    </>
  );

  // No details to reveal (e.g. the showcase) → static banner.
  if (!objectives?.length) {
    return <div className={cn("block w-full", BANNER_LOOK, className)}>{inner}</div>;
  }

  return (
    <>
      {/* The interactive banner is a real Button (full-width via `fullWidth`,
          controlled Modal so it's not wrapped in Modal.Trigger's inline-block).
          Hover/press/focus come from the button itself — no custom lift. */}
      <Button
        variant="outline"
        pill={false}
        clicky={false}
        fullWidth
        onPress={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`View details for level ${level}, ${title}`}
        className={cn(
          "h-auto flex-col items-center gap-0.5 whitespace-normal",
          BANNER_LOOK,
          "data-[hover=true]:border-accent data-[hover=true]:bg-accent/[0.12]",
          className,
        )}
      >
        {inner}
      </Button>

      <Modal
        isOpen={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setConfirming(false);
        }}
        size="sm"
        className="rounded-3xl border border-white/[0.04] bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)]"
      >
        <div className="relative px-6 pb-6 pt-7">
          {/* Plain pill button — Brilliant's close is a subtle translucent hover,
              which HeroUI's ghost variant (solid grey fill) can't match cleanly. */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <CloseIcon />
          </button>

          <div className="text-center">
            <LevelEyebrow level={level} />
            <h2 className="mt-1 text-xl font-bold text-foreground">{title}</h2>
          </div>

          <hr className="my-4 border-t border-separator" />

          <ul className="space-y-3">
            {objectives.map((objective) => (
              <li
                key={objective}
                className="flex gap-3 text-sm leading-relaxed text-foreground/90"
              >
                <span
                  aria-hidden
                  className="mt-[7px] size-1.5 shrink-0 rounded-full bg-muted"
                />
                <span>{objective}</span>
              </li>
            ))}
          </ul>

          {/* When the level is fully completed, offer a red "Reset" action
              (styled like the lesson "Quit") to wipe progress and replay. */}
          {allCompleted && onReset ? (
            <Button
              fullWidth
              variant="ghost"
              onPress={() => {
                if (confirming) {
                  onReset();
                  close();
                } else {
                  setConfirming(true);
                }
              }}
              className="mt-6 font-bold text-danger hover:bg-danger/10"
            >
              {confirming ? "Tap again to reset all progress" : "Reset progress"}
            </Button>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
