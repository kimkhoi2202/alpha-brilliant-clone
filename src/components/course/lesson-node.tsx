import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export type LessonNodeState = "active" | "locked" | "completed";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * Brilliant's course path uses a 3D "puck" — an elliptical coin with a raised
 * top face over a darker base (its thickness) and a soft ground shadow. We build
 * it from stacked ellipses so it themes cleanly: grey when locked, the course
 * accent (blue) when completed, bright white when active.
 */
interface Palette {
  side: string;
  faceA: string;
  faceB: string;
  bumpA: string;
  bumpB: string;
}

const PALETTE: Record<LessonNodeState, Palette> = {
  locked: {
    side: "#4c4c51",
    faceA: "#d4d4d8",
    faceB: "#95959b",
    bumpA: "#e3e3e6",
    bumpB: "#aeaeb4",
  },
  completed: {
    side: "#243c93",
    faceA: "#a9bcff",
    faceB: "#4f6dff",
    bumpA: "#c3d0ff",
    bumpB: "#6a83ff",
  },
  active: {
    side: "#4c4c51",
    faceA: "#ffffff",
    faceB: "#d2d2d8",
    bumpA: "#ffffff",
    bumpB: "#e4e4e8",
  },
};

function Puck({ state, icon }: { state: LessonNodeState; icon?: ReactNode }) {
  const p = PALETTE[state];
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-0 block h-[52px]">
      {/* ground shadow */}
      <span className="absolute bottom-0 left-1/2 h-2.5 w-12 -translate-x-1/2 rounded-[50%] bg-black/55 blur-[5px]" />
      {/* side / thickness */}
      <span
        className="absolute bottom-1.5 left-1/2 h-[42px] w-[68px] -translate-x-1/2 rounded-[50%]"
        style={{ background: p.side }}
      />
      {/* top face */}
      <span
        className="absolute bottom-[10px] left-1/2 h-[42px] w-[68px] -translate-x-1/2 rounded-[50%]"
        style={{ backgroundImage: `linear-gradient(to bottom, ${p.faceA}, ${p.faceB})` }}
      />
      {/* inner bump */}
      <span
        className="absolute bottom-[14px] left-1/2 h-[30px] w-[48px] -translate-x-1/2 rounded-[50%]"
        style={{ backgroundImage: `linear-gradient(to bottom, ${p.bumpA}, ${p.bumpB})` }}
      />
      {(icon || state === "completed") && (
        <span className="absolute bottom-[19px] left-1/2 grid -translate-x-1/2 place-items-center text-[#16234f]">
          {icon ?? <CheckIcon className="size-[18px]" />}
        </span>
      )}
    </span>
  );
}

/** The green location marker that hovers over the current lesson. */
function Pin() {
  return (
    <span className="absolute -top-1 left-1/2 -translate-x-1/2 drop-shadow-[0_5px_5px_rgba(0,0,0,0.45)]">
      <span className="block size-7 rotate-45 rounded-full rounded-br-none bg-success" />
      <span className="absolute inset-0 grid place-items-center">
        <CheckIcon className="size-3.5 text-success-foreground" />
      </span>
    </span>
  );
}

export interface LessonNodeProps {
  label: string;
  state?: LessonNodeState;
  /** Optional content for the puck face (defaults to a state glyph). */
  icon?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** A single node on the course path: a 3D puck + label (Brilliant style). */
export function LessonNode({
  label,
  state = "locked",
  icon,
  onPress,
  className,
}: LessonNodeProps) {
  const locked = state === "locked";
  const active = state === "active";
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={locked}
      aria-current={active ? "step" : undefined}
      className={cn(
        "group flex items-center gap-4 text-left disabled:cursor-not-allowed",
        className,
      )}
    >
      <span className="relative grid h-16 w-[76px] shrink-0 place-items-end">
        {active && (
          <span
            aria-hidden
            className="absolute bottom-0 left-1/2 h-20 w-24 -translate-x-1/2 rounded-[50%] bg-accent/25 blur-2xl"
          />
        )}
        <span
          className={cn(
            "relative block h-[52px] w-full transition-transform duration-200",
            !locked && "group-hover:-translate-y-0.5",
          )}
        >
          <Puck state={state} icon={icon} />
        </span>
        {active && <Pin />}
      </span>
      <span
        className={cn(
          "text-base font-semibold leading-snug",
          active
            ? "text-foreground"
            : locked
              ? "text-muted"
              : "text-foreground/90",
        )}
      >
        {label}
      </span>
    </button>
  );
}
