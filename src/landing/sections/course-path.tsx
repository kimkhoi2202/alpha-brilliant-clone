import { useRef, useState } from "react";
import { useInView } from "motion/react";

import {
  CourseMap,
  type CourseMapNode,
  LessonProgressMedallion,
  LevelHeader,
  type LessonNodeState,
} from "../../components/course";
import { course, getLesson } from "../../content";
import { Reveal, useMotionEnabled, viewportOnce } from "../motion";
import { LandingSection } from "../ui/section";

/**
 * Marketing-only progression for the path preview, keyed by the real lesson ids
 * in `course.ts`. These static demo states stand in for a signed-in learner's
 * saved progress (we deliberately read no auth or stored progress here): two
 * lessons mastered, the third in progress with the "you are here" marker, the
 * rest waiting. This is the exact shape `CourseMapScreen` derives from live
 * `useLearner()` data, so the real `CourseMap` renders identically.
 */
const DEMO_STATE: Partial<Record<string, LessonNodeState>> = {
  "pythagoras-intro": "completed",
  "discover-theorem": "completed",
  "use-the-theorem": "active",
  "find-a-missing-leg": "available",
  "direct-distance": "available",
  "level-review": "available",
};

/**
 * The course path / mastery journey section. Composes the app's *real* course
 * components (`CourseMap` of `LessonNode` pucks, the `LevelHeader` banner, and
 * the `LessonProgressMedallion`) over the real chapter from `content`, framed in
 * the same surface card the hero uses. Nothing here is hand-rolled marketing art:
 * it is the actual product surface, shown with a static preview of progress.
 *
 * Motion direction — "the path lights up". The two columns rise/fade in on
 * scroll, then the medallion ring fills its real mastery progress the first time
 * it enters view (the section's signature, not a uniform fade-up). The Rive
 * lesson pucks own their own art, so we reveal the map card as a unit rather than
 * faking per-puck entrances the components don't expose.
 */
export function CoursePath() {
  const level = course.levels[0];
  const lessonIds = level.lessonIds;

  // Selection (the glow ring) follows the active lesson until the visitor taps
  // another puck, mirroring CourseMapScreen's `selectedId` without touching auth
  // or persisting anything. Defaults to whichever node is the "active" step.
  const activeLessonId =
    lessonIds.find((id) => DEMO_STATE[id] === "active") ?? lessonIds[0];
  const [selectedId, setSelectedId] = useState<string | undefined>(
    activeLessonId,
  );

  const nodes: CourseMapNode[] = lessonIds.map((id) => ({
    id,
    label: getLesson(id)?.title ?? id,
    state: DEMO_STATE[id] ?? "available",
    selected: id === selectedId,
    onPress: () => setSelectedId(id),
  }));

  // Keep the medallion and the map in lock-step: both count the same real ids,
  // so "2 of 6" on the ring matches the two completed pucks on the path.
  const masteredCount = lessonIds.filter(
    (id) => DEMO_STATE[id] === "completed",
  ).length;

  // Ring fill on view: start the medallion empty and set it to the mastered
  // count once it scrolls in, letting the component's own per-segment stroke
  // transition (globals.css) draw each arc in sequence — a real progress fill,
  // not a faked one. Reduced motion / `?motion=off` resolves to the final count
  // immediately (no empty flash), and the medallion's CSS already drops its
  // transition under `prefers-reduced-motion`, so the resting lock-step holds.
  const motionEnabled = useMotionEnabled();
  const medallionRef = useRef<HTMLDivElement>(null);
  const medallionInView = useInView(medallionRef, viewportOnce);
  const ringCurrent = !motionEnabled || medallionInView ? masteredCount : 0;

  return (
    <LandingSection id="course">
      <div className="grid items-stretch gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        {/* Intro rail: the section's heading lives here (left-aligned, matching
            the shared SectionHeading scale) so the column anchors to the top of
            the tall map card instead of a lone ring floating in empty space. The
            mastery medallion + its copy then fill the lower half as a deliberate
            "where you stand" footer. The heading, copy, and that footer rise in
            as a short three-beat sequence. */}
        <div className="flex flex-col items-start">
          <Reveal
            as="h2"
            className="text-balance text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-foreground"
          >
            One chapter, understood all the way down.
          </Reveal>
          <Reveal
            as="p"
            delay={0.08}
            className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
          >
            Five short lessons and a review take you from naming a hypotenuse to
            measuring distance on a grid. You work one step at a time and master
            it before moving on, so every new idea rests on the one before it.
          </Reveal>

          <Reveal
            as="div"
            y={20}
            delay={0.16}
            className="mt-8 flex w-full flex-1 flex-col justify-center gap-5 rounded-2xl border border-border bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-7 lg:mt-10"
          >
            <div ref={medallionRef} className="shrink-0">
              <LessonProgressMedallion
                current={ringCurrent}
                total={lessonIds.length}
              />
            </div>
            <div className="flex max-w-sm flex-col gap-3">
              <p className="text-sm leading-relaxed text-muted">
                Each lesson rolls up into a mastery signal, so you can see at a
                glance what is solid and what to revisit.
              </p>
              <p className="text-sm leading-relaxed text-muted">
                Finish the chapter and Infinite Practice keeps fresh, verified
                problems coming.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal className="relative" y={24} delay={0.1} amount={0.2}>
          <div
            role="group"
            aria-label={`${course.title} course path preview`}
            className="rounded-2xl border-2 border-border bg-[var(--surface)] p-6 sm:p-8"
          >
            <div className="mx-auto w-full max-w-md overflow-x-hidden">
              <CourseMap
                header={
                  <LevelHeader
                    level={1}
                    title={level.title}
                    objectives={level.objectives}
                  />
                }
                nodes={nodes}
              />
            </div>
          </div>
        </Reveal>
      </div>
    </LandingSection>
  );
}
