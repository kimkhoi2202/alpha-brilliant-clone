import { cn } from "../../lib/cn";

/** A single frozen confetti chip: a small rotated, rounded square. */
interface ConfettiPiece {
  /** Center x in the 1200x480 viewBox. */
  cx: number;
  /** Center y in the 1200x480 viewBox. */
  cy: number;
  size: number;
  rotate: number;
  fill: string;
  opacity: number;
}

// The brand quartet, pulled straight from the theme tokens (blue accent, gold,
// green, pink) so the burst recolors with the app instead of hardcoding hex.
const ACCENT = "var(--accent)";
const GOLD = "var(--warning)";
const GREEN = "var(--success)";
const PINK = "var(--bp-pink-400)";

// A hand-placed scatter: dense and bright near the top center, fanning out and
// dimming as it falls, like confetti caught mid-air. The chips are squares on
// purpose, the theorem's unit cell, so the static celebration still nods to
// a2 + b2 = c2.
const PIECES: ConfettiPiece[] = [
  { cx: 600, cy: 54, size: 26, rotate: 16, fill: ACCENT, opacity: 0.95 },
  { cx: 520, cy: 92, size: 16, rotate: 32, fill: GOLD, opacity: 0.9 },
  { cx: 682, cy: 82, size: 18, rotate: -20, fill: PINK, opacity: 0.9 },
  { cx: 452, cy: 58, size: 14, rotate: 10, fill: GREEN, opacity: 0.82 },
  { cx: 748, cy: 62, size: 20, rotate: 28, fill: ACCENT, opacity: 0.85 },
  { cx: 380, cy: 120, size: 18, rotate: -14, fill: GOLD, opacity: 0.8 },
  { cx: 820, cy: 124, size: 16, rotate: 22, fill: GREEN, opacity: 0.8 },
  { cx: 600, cy: 134, size: 14, rotate: 40, fill: PINK, opacity: 0.78 },
  { cx: 300, cy: 78, size: 12, rotate: 18, fill: ACCENT, opacity: 0.72 },
  { cx: 902, cy: 86, size: 14, rotate: -24, fill: GOLD, opacity: 0.72 },
  { cx: 250, cy: 162, size: 16, rotate: 30, fill: PINK, opacity: 0.7 },
  { cx: 952, cy: 168, size: 18, rotate: -16, fill: ACCENT, opacity: 0.7 },
  { cx: 520, cy: 182, size: 12, rotate: 8, fill: GREEN, opacity: 0.66 },
  { cx: 700, cy: 190, size: 14, rotate: -30, fill: GOLD, opacity: 0.66 },
  { cx: 168, cy: 120, size: 12, rotate: 24, fill: GREEN, opacity: 0.6 },
  { cx: 1032, cy: 120, size: 12, rotate: -20, fill: PINK, opacity: 0.6 },
  { cx: 402, cy: 224, size: 14, rotate: 16, fill: ACCENT, opacity: 0.56 },
  { cx: 800, cy: 230, size: 12, rotate: -12, fill: GREEN, opacity: 0.56 },
  { cx: 600, cy: 252, size: 16, rotate: 36, fill: GOLD, opacity: 0.54 },
  { cx: 120, cy: 220, size: 10, rotate: 14, fill: GOLD, opacity: 0.5 },
  { cx: 1080, cy: 224, size: 10, rotate: -28, fill: ACCENT, opacity: 0.5 },
  { cx: 322, cy: 300, size: 12, rotate: 20, fill: PINK, opacity: 0.46 },
  { cx: 882, cy: 308, size: 12, rotate: -18, fill: GOLD, opacity: 0.46 },
];

export interface CtaConfettiStaticProps {
  className?: string;
}

/**
 * Static, reduced-motion fallback for the Final CTA celebration: a frozen burst
 * of brand-colored unit squares. Purely decorative (aria-hidden, no pointer or
 * text selection), masked to fade downward so it never crowds the copy beneath.
 */
export function CtaConfettiStatic({ className }: CtaConfettiStaticProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none select-none", className)}
      style={{
        WebkitMaskImage:
          "linear-gradient(to bottom, #000 0%, #000 58%, transparent 92%)",
        maskImage:
          "linear-gradient(to bottom, #000 0%, #000 58%, transparent 92%)",
      }}
    >
      <svg
        className="size-full"
        viewBox="0 0 1200 480"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {PIECES.map((piece) => (
          <rect
            key={`${piece.cx}-${piece.cy}`}
            x={piece.cx - piece.size / 2}
            y={piece.cy - piece.size / 2}
            width={piece.size}
            height={piece.size}
            rx={Math.max(2, piece.size * 0.2)}
            fill={piece.fill}
            opacity={piece.opacity}
            transform={`rotate(${piece.rotate} ${piece.cx} ${piece.cy})`}
          />
        ))}
      </svg>
    </div>
  );
}
