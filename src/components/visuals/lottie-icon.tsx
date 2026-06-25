import { useEffect, useRef } from "react";
import lottie, { type AnimationItem } from "lottie-web";

import { cn } from "../../lib/cn";

export interface LottieIconProps {
  /** Path to a Lottie JSON in /public (e.g. "/lottie/home.json"). */
  path: string;
  /** While true, the animation loops; when it flips false it finishes the
   *  current cycle and stops (no abrupt cut). */
  play: boolean;
  /** Square pixel size. */
  size?: number;
  /**
   * Recolor to a single `currentColor` outline: strokes inherit the text
   * colour and fills are dropped, so an animated icon matches the static ones
   * beside it (and themes for free).
   */
  monochrome?: boolean;
  className?: string;
}

/**
 * A small Lottie icon driven by a `play` flag: while `play` is true it loops;
 * when `play` flips false it lets the current cycle finish and then stops (no
 * abrupt cut). Self-hosted via lottie-web, no external script or token, so we
 * keep full control of looping, speed and colour.
 */
export function LottieIcon({
  path,
  play,
  size = 20,
  monochrome = false,
  className,
}: LottieIconProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const loadedRef = useRef(false);
  // Latest `play` for the async-load catch-up, without re-subscribing.
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    loadedRef.current = false;
    const anim = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: false,
      autoplay: false,
      path,
    });
    animRef.current = anim;
    const onLoaded = () => {
      loadedRef.current = true;
      // Catch up if the pointer is already over the target when it finishes loading.
      if (playRef.current) {
        anim.loop = true;
        anim.setDirection(1);
        anim.play();
      }
    };
    anim.addEventListener("DOMLoaded", onLoaded);
    return () => {
      anim.destroy();
      animRef.current = null;
      loadedRef.current = false;
    };
  }, [path]);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim || !loadedRef.current) return;
    if (play) {
      // Loop while hovered/focused.
      anim.loop = true;
      anim.setDirection(1);
      anim.play();
    } else {
      // Stop looping but let the in-flight cycle play out to its end.
      anim.loop = false;
    }
  }, [play]);

  return (
    <span
      ref={containerRef}
      aria-hidden
      className={cn(monochrome && "lottie-icon-mono", className)}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
