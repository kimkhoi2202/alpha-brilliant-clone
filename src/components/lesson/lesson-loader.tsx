import { Fit } from "@rive-app/react-webgl2";

import { LESSON_LOADER_RIV } from "../../lib/rive-runtime";
import { RivePlayer } from "../visuals";

/**
 * Brilliant's full-screen lesson loader (Koji + dumbbell + rotating status
 * text). Shown for a brief beat whenever a lesson launches.
 */
export function LessonLoader() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background">
      {/* Play a looping timeline: autoplay otherwise settles on a one-shot
          intro (Koji + beam) and freezes. */}
      <RivePlayer
        src={LESSON_LOADER_RIV}
        animations="Loop_v05_Minimal"
        fit={Fit.Contain}
        className="h-svh w-full max-w-3xl"
      />
    </div>
  );
}
