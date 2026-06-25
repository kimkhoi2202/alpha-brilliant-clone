import { Chip } from "../ui";
import { CelebrationScreen } from "./celebration-screen";

export interface TrialUnlockedProps {
  days?: number;
  name?: string;
  onContinue?: () => void;
  className?: string;
}

/** "Premium Trial Unlocked!" celebration with a rewards burst. */
export function TrialUnlocked({
  days = 7,
  name,
  onContinue,
  className,
}: TrialUnlockedProps) {
  return (
    <CelebrationScreen
      art="🎁"
      title="Premium Trial Unlocked!"
      subtitle={`Enjoy ${days} free days${name ? `, ${name}` : ""}.`}
      onContinue={onContinue}
      className={className}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Chip intent="warning">💎 Gems</Chip>
        <Chip intent="accent">🔑 Key</Chip>
        <Chip intent="success" variant="solid">
          +45 XP
        </Chip>
      </div>
    </CelebrationScreen>
  );
}
