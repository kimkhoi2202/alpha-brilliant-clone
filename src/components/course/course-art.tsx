import { cn } from "../../lib/cn";

/**
 * Course hero art for the Pythagorean Theorem (the squares-on-each-side image).
 * The asset is actually a black-background JPEG (no real transparency), so we
 * drop the black with `mix-blend-lighten`: it composites cleanly onto the dark
 * course card. (If a truly transparent PNG is ever supplied, the blend can go.)
 */
export function PythagorasArt({ className }: { className?: string }) {
  return (
    <img
      src="/pythagoras-thumbnail.png"
      alt="A right triangle with a square drawn on each side"
      width={1024}
      height={1024}
      className={cn("h-auto w-28 mix-blend-lighten", className)}
    />
  );
}
