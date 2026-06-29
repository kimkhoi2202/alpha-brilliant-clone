/* eslint-disable react-hooks/purity -- Aceternity's source calls Math.random()
   during render; kept verbatim. The field is decorative and renders once inside
   the final-CTA band, so the impurity is harmless here. */
import { cn } from "../../lib/cn";
import { motion } from "motion/react";

/**
 * Aceternity UI "Meteors" — https://ui.aceternity.com/components/meteors
 *
 * Copied manually (not via the shadcn CLI). The meteor logic, classes, position
 * math and timings are verbatim from Aceternity; the only integration changes
 * for this Vite + strict-TS app are: import `cn` from our `lib/cn` (we have no
 * `@/lib/utils` alias), drop the Next-only `"use client"` directive and the
 * unused `import React`, and name the unused `.map` arg `_el` (noUnusedParameters).
 * The `animate-meteor-effect` utility + `@keyframes meteor` live in globals.css.
 */
export const Meteors = ({
  number,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  const meteors = new Array(number || 20).fill(true);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {meteors.map((_el, idx) => {
        const meteorCount = number || 20;
        // Spread evenly across the FULL container width as a percentage.
        // (Aceternity's original `idx*(800/count)-400` is a fixed px range tuned
        // for their narrow max-w-xl demo card; on a wide band that only covers
        // the left side, so we use a percentage to fill the whole width.)
        const position = (idx / meteorCount) * 100;

        return (
          <span
            key={"meteor" + idx}
            className={cn(
              "animate-meteor-effect absolute h-0.5 w-0.5 rotate-[45deg] rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10]",
              "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-[50%] before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
              className,
            )}
            style={{
              top: "-40px", // Start above the container
              left: position + "%",
              animationDelay: Math.random() * 5 + "s", // Random delay between 0-5s
              animationDuration: Math.floor(Math.random() * (10 - 5) + 5) + "s", // Keep some randomness in duration
            }}
          ></span>
        );
      })}
    </motion.div>
  );
};
