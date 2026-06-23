import { CelebrationScreen } from "./celebration-screen";

export interface StreakStartedProps {
  count?: number;
  onContinue?: () => void;
  className?: string;
}

/** "You started a streak!" celebration. */
export function StreakStarted({
  count = 1,
  onContinue,
  className,
}: StreakStartedProps) {
  return (
    <CelebrationScreen
      art="⚡"
      title="You started a streak!"
      subtitle={`${count} day streak`}
      onContinue={onContinue}
      className={className}
    />
  );
}
