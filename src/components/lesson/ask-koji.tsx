import { useCallback } from "react";
import { Fit, type Rive } from "@rive-app/react-webgl2";

import { ASK_KOJI_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

/**
 * The ask_koji file has no `idle` timeline — `idle` is a trigger on the
 * `ask-koji-button` state machine, and the character only enters the frame once
 * `play-enter` fires (otherwise just the `< >` bracket frame draws). Fire it on
 * load so Koji swoops in and settles into his resting idle.
 */
function enterKoji(rive: Rive) {
  try {
    const inputs = rive.stateMachineInputs("ask-koji-button");
    inputs.find((i) => i.name === "play-enter")?.fire();
  } catch {
    /* state machine not ready yet — ignore */
  }
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
    </svg>
  );
}

/**
 * Brilliant's in-lesson mascot helper, pinned bottom-left: Koji on his node
 * base, plus chat and voice affordances. The chat/voice buttons are placeholders
 * for now.
 */
export function AskKoji() {
  const onRive = useCallback((rive: Rive) => enterKoji(rive), []);

  return (
    <div className="absolute bottom-3 left-3 z-50 flex items-center gap-2 lg:bottom-4 lg:left-4">
      <button
        type="button"
        aria-label="Ask Koji"
        className="grid size-14 place-items-center rounded-full transition-transform hover:-translate-y-0.5"
      >
        <RivePlayer
          src={ASK_KOJI_RIV}
          stateMachines="ask-koji-button"
          onRive={onRive}
          fit={Fit.Contain}
          className="size-14"
        />
      </button>
      <button
        type="button"
        aria-label="Chat with Koji"
        className="grid size-9 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
      >
        <ChatIcon />
      </button>
      <button
        type="button"
        aria-label="Talk to Koji"
        className="grid size-9 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-foreground"
      >
        <MicIcon />
      </button>
    </div>
  );
}
