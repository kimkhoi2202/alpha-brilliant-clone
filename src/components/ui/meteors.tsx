import { useState } from "react";

import { cn } from "../../lib/cn";

import "./meteors.css";

export interface MeteorsProps {
  number?: number;
  className?: string;
}

/**
 * Aceternity-style "Meteors" effect: a field of small streaks that fall
 * diagonally across the parent box. Purely decorative — render it inside a
 * `relative overflow-hidden` container behind the content, marked `aria-hidden`.
 *
 * Adapted for this repo: streaks spread evenly across the FULL width via `%`
 * offsets (so the right edge isn't bare) and are tinted toward the foreground
 * so they read clearly on the dark `--surface` card while staying subtle.
 */
export function Meteors({ number = 20, className }: MeteorsProps) {
  // The per-streak delay/duration is decorative randomness that must stay fixed
  // across re-renders — rolling it during render is impure and would re-jitter
  // every streak on any parent update. A lazy initializer computes it once.
  const [meteors] = useState(() =>
    Array.from({ length: number }, (_, idx) => ({
      left: (idx / number) * 100 + "%",
      animationDelay: (Math.random() * 0.6 + 0.2).toFixed(2) + "s",
      animationDuration: Math.floor(Math.random() * (10 - 4) + 4) + "s",
    })),
  );
  return (
    <>
      {meteors.map((meteor, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] rounded-full bg-slate-300 shadow-[0_0_0_1px_#ffffff20]",
            "before:absolute before:top-1/2 before:h-px before:w-[60px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-slate-300 before:to-transparent before:content-['']",
            "motion-reduce:hidden",
            className,
          )}
          style={{
            top: 0,
            left: meteor.left,
            animationDelay: meteor.animationDelay,
            animationDuration: meteor.animationDuration,
          }}
        />
      ))}
    </>
  );
}
