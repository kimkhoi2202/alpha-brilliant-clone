import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { KojiMascot, type MascotReactionSignal } from "../../components/lesson/koji";
import { useMotionEnabled } from "../motion";

/**
 * A scroll-following Koji companion: the app's real Rive mascot rides down the
 * right gutter as the reader scrolls, so the tutor "comes along" through the page
 * (a reimagining of Brilliant's Meet-Koji moment, not a copy — no vertical thread
 * line). Koji idles, swoops in on mount, and gives a small wave/success beat each
 * time the reader crosses into a new third of the page.
 *
 * Decorative and `pointer-events-none`, so it never blocks the UI. Shown only on
 * `xl+` where the centered content leaves gutter room; on smaller screens Koji
 * already appears in the Features tile and the "Meet Koji" section. Reduced motion
 * / `?motion=off` parks Koji statically with no travel and no reaction loop.
 *
 * NOTE: this renders the working `ask_koji` Rive (the same Koji character). The
 * provided `meet_koji.riv` (public/rive/meet-koji.riv) is a newer Rive file format
 * (v7.1) that no published runtime can load yet; once it's re-exported to a
 * runtime-compatible format, swap the mascot here for one bound to that file's own
 * state machine.
 */

/** One reaction per page-third, fired as the reader crosses into it. */
const ZONE_REACTIONS = ["waveRight", "successSmall", "waveLeft"] as const;

export function KojiCompanion() {
  const motionEnabled = useMotionEnabled();
  const { scrollYProgress } = useScroll();
  // Smooth the raw scroll progress so Koji glides rather than snaps.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 20,
    mass: 0.6,
  });

  // The vertical rail Koji travels, derived from the viewport (recomputed on
  // resize). Koji starts ~16vh down and ends ~14vh from the bottom. Seeded from
  // the real viewport on first render so there's no top-of-screen flash.
  const measure = () => {
    if (typeof window === "undefined") return { top: 0, height: 0 };
    const h = window.innerHeight;
    const top = Math.round(h * 0.16);
    const bottom = Math.round(h * 0.14);
    const kojiPx = 64; // size-16
    return { top, height: Math.max(0, h - top - bottom - kojiPx) };
  };
  const [rail, setRail] = useState(measure);
  useEffect(() => {
    const onResize = () => setRail(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Travel = progress × rail height (px). Function syntax tracks `smooth`; when
  // motion is off it pins to 0 (Koji rests at the rail's top).
  const y = useTransform(() =>
    motionEnabled ? smooth.get() * rail.height : 0,
  );

  // Fire a gentle reaction when the reader crosses into a new page-third.
  const [reaction, setReaction] = useState<MascotReactionSignal | undefined>();
  const zoneRef = useRef(-1);
  const nonceRef = useRef(0);
  useEffect(() => {
    if (!motionEnabled) return;
    const unsubscribe = smooth.on("change", (p) => {
      const zone = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
      if (zone === zoneRef.current) return;
      zoneRef.current = zone;
      nonceRef.current += 1;
      setReaction({
        name: ZONE_REACTIONS[zone],
        nonce: nonceRef.current,
        ts: Date.now(),
      });
    });
    return () => unsubscribe();
  }, [motionEnabled, smooth]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-3 z-30 hidden min-[1320px]:block"
      style={{ top: rail.top }}
    >
      <motion.div style={{ y }} className="drop-shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
        <KojiMascot size="size-16" loop={motionEnabled} reactionSignal={reaction} />
      </motion.div>
    </div>
  );
}
