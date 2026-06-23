import { cn } from "../../lib/cn";

const CENTER = 80;
const ARC_RADIUS = 60;
const START_ANGLE = -90;

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

function gapForTotal(total: number) {
  if (total <= 5) return 16;
  if (total <= 8) return 12;
  if (total <= 12) return 9;
  return 6;
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
  const gapAngle = gapForTotal(normalizedTotal);
  const segmentAngle = (360 - gapAngle * normalizedTotal) / normalizedTotal;
  const firstSegmentStart = START_ANGLE + gapAngle / 2;

  return (
    <figure
      role="img"
      aria-label={`${completed} of ${normalizedTotal} ${label.toLowerCase()} complete`}
      className={cn(
        "lesson-progress-medallion grid justify-items-center gap-3",
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
            const startAngle =
              firstSegmentStart + index * (segmentAngle + gapAngle);
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
