import type { CSSProperties } from "react";

import { cn } from "../../lib/cn";

export interface GlowingEffectProps {
  className?: string;
  /** Ring thickness in px. */
  borderWidth?: number;
  /** Glow-halo blur in px (0 disables the halo). */
  blur?: number;
  /** Seconds per full rotation — smaller is faster. */
  duration?: number;
}

/**
 * An always-on glowing animated border. This is an always-rotating take on
 * Aceternity's GlowingEffect (https://ui.aceternity.com/components/glowing-effect),
 * which is normally hover/proximity-driven — here a brand-blue conic gradient is
 * masked to a thin ring and spun continuously (no pointer needed), with a blurred
 * copy behind it for the halo.
 *
 * Render it as a child of a `relative` rounded container, behind the content; it
 * inherits the parent's corner radius. Honors `prefers-reduced-motion` (the ring
 * stays visible, it just stops spinning). The gradient + keyframes live in
 * globals.css under `.alpha-glow-border`.
 */
export function GlowingEffect({
  className,
  borderWidth = 2,
  blur = 18,
  duration = 2,
}: GlowingEffectProps) {
  const vars = {
    "--glow-border-width": `${borderWidth}px`,
    "--glow-duration": `${duration}s`,
    borderRadius: "inherit",
  } as CSSProperties;

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{ borderRadius: "inherit" }}
    >
      {blur > 0 ? (
        <div
          className="alpha-glow-border absolute inset-0 opacity-60"
          style={{ ...vars, filter: `blur(${blur}px)` }}
        />
      ) : null}
      <div className="alpha-glow-border absolute inset-0" style={vars} />
    </div>
  );
}
