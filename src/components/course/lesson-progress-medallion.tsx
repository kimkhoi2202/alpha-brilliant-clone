import { cn } from "../../lib/cn";

const CENTER = 80;
const ARC_RADIUS = 60;
const START_ANGLE = -90;

// Must stay in sync with `.lesson-progress-medallion__segment` in globals.css.
const STROKE_WIDTH = 12;

// Round line caps overshoot each arc end by half the stroke width. Expressed as
// an angle at ARC_RADIUS, that overshoot is what visually eats into the gap, so
// we work in terms of the *visible* gap and add the overshoot back when placing
// the path endpoints. Without this, segments crowd together (and even overlap
// at high counts) no matter how big the raw gap angle is.
const CAP_ANGLE = ((STROKE_WIDTH / 2 / ARC_RADIUS) * 180) / Math.PI;

// Visible gap target, tuned on /medallions across the full 1–20 range. Kept
// moderate: clearly separated, but not so wide that low counts drift apart.
const MIN_VISIBLE_GAP = 4.5; // keeps ~20 segments clearly separated
const MAX_VISIBLE_GAP = 7.5; // ceiling for low counts (2–6)
const GAP_RATIO = 0.24; // share of each segment's slot devoted to the gap
const MIN_SEGMENT_ANGLE = 1; // a gap can never fully consume its arc

export interface LessonProgressMedallionProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pointOnCircle(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function segmentPath(startAngle: number, endAngle: number) {
  const start = pointOnCircle(startAngle, ARC_RADIUS);
  const end = pointOnCircle(endAngle, ARC_RADIUS);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A ${ARC_RADIUS} ${ARC_RADIUS} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
  ].join(" ");
}

/**
 * Geometry for one ring of `total` segments. The gap scales with the segment
 * count so it reads clearly at low counts without swallowing the arcs at high
 * counts. `gapAngle` is the raw angle between path endpoints (it includes the
 * round-cap overshoot), while `segmentAngle + gapAngle === unit` keeps the
 * segments evenly distributed around the circle.
 */
function segmentGeometry(total: number) {
  const unit = 360 / total;

  if (total <= 1) {
    // A lone lesson reads as a near-complete ring with a single hairline gap.
    const gapAngle = CAP_ANGLE * 2 + 4;
    return { unit: 360, gapAngle, segmentAngle: 360 - gapAngle };
  }

  const visibleGap = clamp(unit * GAP_RATIO, MIN_VISIBLE_GAP, MAX_VISIBLE_GAP);
  const gapAngle = Math.min(
    visibleGap + CAP_ANGLE * 2,
    unit - MIN_SEGMENT_ANGLE,
  );

  return { unit, gapAngle, segmentAngle: unit - gapAngle };
}

/** Dynamic circular lesson progress: one separated arc per total lesson. */
export function LessonProgressMedallion({
  current,
  total,
  label = "Lessons",
  className,
}: LessonProgressMedallionProps) {
  const normalizedTotal = Math.max(1, Math.round(total));
  const completed = clamp(Math.round(current), 0, normalizedTotal);
  // Filled arcs are yellow while there's still progress to make, and turn green
  // once every lesson is done.
  const allComplete = completed >= normalizedTotal;
  const { unit, gapAngle, segmentAngle } = segmentGeometry(normalizedTotal);
  const firstSegmentStart = START_ANGLE + gapAngle / 2;

  return (
    <figure
      role="img"
      aria-label={`${completed} of ${normalizedTotal} ${label.toLowerCase()} complete`}
      className={cn(
        "lesson-progress-medallion grid justify-items-center gap-3",
        allComplete && "lesson-progress-medallion--complete",
        className,
      )}
    >
      <div className="relative grid size-40 place-items-center">
        <svg
          viewBox="0 0 160 160"
          className="size-full overflow-visible"
          aria-hidden
        >
          {Array.from({ length: normalizedTotal }, (_, index) => {
            const startAngle = firstSegmentStart + index * unit;
            const endAngle = startAngle + segmentAngle;
            const isFilled = index < completed;

            return (
              <path
                key={index}
                d={segmentPath(startAngle, endAngle)}
                className={cn(
                  "lesson-progress-medallion__segment",
                  isFilled && "lesson-progress-medallion__segment--filled",
                )}
                style={{
                  animationDelay: isFilled ? `${index * 36}ms` : undefined,
                  transitionDelay: isFilled ? `${index * 18}ms` : undefined,
                }}
              />
            );
          })}
        </svg>

        <figcaption className="absolute inset-0 grid place-items-center text-center">
          <span className="flex flex-col items-center leading-none">
            <span className="text-[2.05rem] font-extrabold tabular-nums tracking-normal text-foreground">
              {completed}/{normalizedTotal}
            </span>
            <span className="mt-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-muted">
              {label}
            </span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
}
