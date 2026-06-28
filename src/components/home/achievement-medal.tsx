import { cn } from "../../lib/cn";
import { Badge } from "../ui";
import type {
  Achievement,
  AchievementTier,
} from "../../lib/learning/achievements";

export interface AchievementMedalProps {
  achievement: Achievement;
  /** Unlock epoch-ms, or `null` when still locked. */
  unlockedAt: number | null;
  /** Unlocked within the last day: shows a "NEW" pip. */
  isNew?: boolean;
  /** When set, the medal is a button (opens its detail). */
  onPress?: () => void;
  className?: string;
}

interface TierStyle {
  /** Tile border + fill, used only when unlocked. */
  tile: string;
  /** Emoji disc: tinted background + glyph color. */
  disc: string;
}

/**
 * Tier identity stays inside the sanctioned palette: gold is the warning hue
 * (bright gold), bronze is a deepened tone of that SAME hue (brass, from the
 * yellow ramp token), and silver is neutral white. No new accent hue is
 * introduced; the three read as bright / cool / deep against the charcoal.
 */
const TIER: Record<AchievementTier, TierStyle> = {
  gold: {
    tile: "border-warning/30 bg-warning/15",
    disc: "bg-warning/20 text-warning",
  },
  silver: {
    tile: "border-white/15 bg-white/[0.06]",
    disc: "bg-white/[0.1] text-foreground",
  },
  bronze: {
    tile: "border-[color-mix(in_srgb,var(--bp-yellow-600)_35%,transparent)] bg-[color-mix(in_srgb,var(--bp-yellow-600)_13%,transparent)]",
    disc: "bg-[color-mix(in_srgb,var(--bp-yellow-600)_20%,transparent)] text-[var(--bp-yellow-600)]",
  },
};

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A square-ish achievement tile: tier-toned when earned, dim + locked otherwise. */
export function AchievementMedal({
  achievement,
  unlockedAt,
  isNew = false,
  onPress,
  className,
}: AchievementMedalProps) {
  const unlocked = unlockedAt !== null;
  const tier = TIER[achievement.tier];
  const showNew = isNew && unlocked;
  // Accessible name carries the state since the visuals (tint, lock glyph) are
  // decorative; "new" is appended so the freshly-earned ones announce it too.
  const a11yName = `${achievement.title}, ${unlocked ? "unlocked" : "locked"}${
    showNew ? ", new" : ""
  }`;

  const shell = cn(
    "relative flex min-h-[5rem] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 text-center transition duration-150 ease-out motion-reduce:transition-none",
    unlocked ? tier.tile : "border-border/60 bg-background",
    onPress &&
      "hover:-translate-y-0.5 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 motion-reduce:hover:translate-y-0",
    className,
  );

  const content = (
    <>
      {showNew ? (
        <Badge intent="accent" className="absolute right-1.5 top-1.5">
          New
        </Badge>
      ) : null}

      <span
        aria-hidden
        className={cn(
          "grid size-9 place-items-center rounded-full text-2xl leading-none",
          unlocked ? tier.disc : "bg-default text-foreground opacity-40 grayscale",
        )}
      >
        {achievement.icon}
      </span>

      <span
        className={cn(
          "line-clamp-2 text-[0.7rem] font-semibold leading-tight",
          unlocked ? "text-foreground" : "text-muted",
        )}
      >
        {achievement.title}
      </span>

      {!unlocked ? (
        <LockIcon className="absolute bottom-1.5 right-1.5 size-3.5 text-muted" />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <button
        type="button"
        onClick={onPress}
        aria-label={a11yName}
        className={shell}
      >
        {content}
      </button>
    );
  }

  return (
    <div role="img" aria-label={a11yName} className={shell}>
      {content}
    </div>
  );
}
