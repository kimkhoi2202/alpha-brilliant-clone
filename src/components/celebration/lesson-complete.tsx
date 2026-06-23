import { cn } from "../../lib/cn";
import { CelebrationScreen } from "./celebration-screen";
import { ConfettiBurst } from "./confetti-burst";
import { CongratsBadge } from "./congrats-badge";

export interface LessonCompleteProps {
  xp: number;
  onContinue?: () => void;
  className?: string;
}

/** "Lesson complete!" celebration — confetti + the congrats badge + total XP. */
export function LessonComplete({ xp, onContinue, className }: LessonCompleteProps) {
  return (
    <div className={cn("relative overflow-hidden bg-[#313131]", className)}>
      <ConfettiBurst className="absolute inset-0 z-0" />
      <div className="relative z-10">
        <CelebrationScreen
          art={<CongratsBadge className="size-40" />}
          title="Lesson complete!"
          onContinue={onContinue}
        >
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Total XP
            </p>
            <p className="text-4xl font-bold text-warning">{xp} ✦</p>
          </div>
        </CelebrationScreen>
      </div>
    </div>
  );
}
