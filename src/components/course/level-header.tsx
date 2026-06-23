import { cn } from "../../lib/cn";

export interface LevelHeaderProps {
  level: string | number;
  title: string;
  className?: string;
}

/** The "LEVEL 1 / Visualize Fractions" banner atop a course-map section. */
export function LevelHeader({ level, title, className }: LevelHeaderProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/40 bg-surface px-6 py-3 text-center",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-accent">
        Level {level}
      </p>
      <p className="text-base font-bold text-foreground">{title}</p>
    </div>
  );
}
