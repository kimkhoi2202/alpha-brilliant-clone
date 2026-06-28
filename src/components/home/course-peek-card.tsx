import { cn } from "../../lib/cn";
import { Button, ProgressBar } from "../ui";
import { PythagorasArt } from "../course";

export interface CoursePeekCardProps {
  title: string;
  completedLessons: number;
  totalLessons: number;
  mastered: number;
  totalSkills: number;
  onOpen: () => void;
  className?: string;
}

/**
 * A compact glance at the active course for Home: the mark, lesson progress,
 * and skills mastered, with a jump to the full map. Home stays a cockpit, not a
 * second copy of the course map.
 */
export function CoursePeekCard({
  title,
  completedLessons,
  totalLessons,
  mastered,
  totalSkills,
  onOpen,
  className,
}: CoursePeekCardProps) {
  const lessonPct =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-border bg-background p-5",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <PythagorasArt className="w-12 shrink-0" />
        <h3 className="min-w-0 text-lg font-bold leading-tight text-foreground">
          {title}
        </h3>
      </div>

      <div className="mt-5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Lessons
          </span>
          <span className="text-xs font-semibold tabular-nums text-muted">
            <span className="text-foreground">{completedLessons}</span>/
            {totalLessons}
          </span>
        </div>
        <ProgressBar
          value={lessonPct}
          size="sm"
          aria-label={`${completedLessons} of ${totalLessons} lessons complete`}
        />
      </div>

      <p className="mt-3 text-sm text-muted">
        <span className="font-semibold tabular-nums text-foreground">
          {mastered}/{totalSkills}
        </span>{" "}
        skills mastered
      </p>

      <Button variant="secondary" fullWidth className="mt-5" onPress={onOpen}>
        View course map
      </Button>
    </div>
  );
}
