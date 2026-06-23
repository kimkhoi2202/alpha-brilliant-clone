import { CelebrationScreen } from "./celebration-screen";

export interface LessonCompleteProps {
  xp: number;
  onContinue?: () => void;
  className?: string;
}

/** "Lesson complete!" celebration with total XP. */
export function LessonComplete({ xp, onContinue, className }: LessonCompleteProps) {
  return (
    <CelebrationScreen
      art="🏆"
      title="Lesson complete!"
      onContinue={onContinue}
      className={className}
    >
      <div className="flex flex-col items-center gap-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Total XP
        </p>
        <p className="text-4xl font-bold text-warning">{xp} ✦</p>
      </div>
    </CelebrationScreen>
  );
}
