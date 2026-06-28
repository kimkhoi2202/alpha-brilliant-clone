import { useState } from "react";

import { cn } from "../../lib/cn";
import { Badge, type BadgeIntent, Button, Modal } from "../ui";
import {
  achievements,
  type Achievement,
  type AchievementTier,
} from "../../lib/learning/achievements";
import { useLearner } from "../../lib/learner";
import { AchievementMedal } from "./achievement-medal";

const DAY_MS = 24 * 60 * 60 * 1000;

interface TierMeta {
  label: string;
  badge: BadgeIntent;
  /** Emoji disc in the detail dialog (mirrors the medal's tier tint). */
  disc: string;
}

/** Same tier identity as the medal: gold = warning, bronze = deepened gold,
 *  silver = neutral. The badge spells the tier out so color never carries it
 *  alone. */
const TIER_META: Record<AchievementTier, TierMeta> = {
  gold: { label: "Gold", badge: "warning", disc: "bg-warning/20 text-warning" },
  silver: {
    label: "Silver",
    badge: "neutral",
    disc: "bg-white/[0.1] text-foreground",
  },
  bronze: {
    label: "Bronze",
    badge: "neutral",
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

function formatUnlockDate(ms: number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

function AchievementDetail({
  achievement,
  unlockedAt,
  onClose,
}: {
  achievement: Achievement;
  unlockedAt: number | null;
  onClose: () => void;
}) {
  const meta = TIER_META[achievement.tier];
  const unlocked = unlockedAt !== null;

  return (
    <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-7 text-center">
      <span
        aria-hidden
        className={cn(
          "grid size-16 place-items-center rounded-2xl text-4xl leading-none",
          unlocked ? meta.disc : "bg-default text-foreground opacity-40 grayscale",
        )}
      >
        {achievement.icon}
      </span>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <h2 className="text-xl font-bold text-foreground">{achievement.title}</h2>
          <Badge intent={meta.badge}>{meta.label}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          {achievement.description}
        </p>
      </div>

      {unlockedAt !== null ? (
        <p className="text-sm font-semibold text-success">
          Unlocked{" "}
          <span className="tabular-nums">{formatUnlockDate(unlockedAt)}</span>
        </p>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
          <LockIcon className="size-3.5" />
          Locked
        </p>
      )}

      <Button fullWidth className="mt-1" onPress={onClose}>
        {unlocked ? "Nice" : "Got it"}
      </Button>
    </div>
  );
}

export interface AchievementsShelfProps {
  className?: string;
}

/** The learner's trophy case: every catalog achievement, earned ones first. */
export function AchievementsShelf({ className }: AchievementsShelfProps) {
  const { unlockedAchievements } = useLearner();
  const unlocked = unlockedAchievements();

  // `active` persists through the dialog's close animation (so content doesn't
  // blank mid-exit); `open` drives the actual visibility.
  const [active, setActive] = useState<Achievement | null>(null);
  const [open, setOpen] = useState(false);

  const unlockedCount = achievements.filter(
    (a) => unlocked[a.id] !== undefined,
  ).length;

  // Mount-time clock for the "NEW" window keeps the render pure.
  const [now] = useState(() => Date.now());
  // Earned first (most recent unlock leads), then locked in catalog order.
  // Array.sort is stable, so returning 0 preserves the catalog order for the
  // locked tail.
  const ordered = [...achievements].sort((a, b) => {
    const ua = unlocked[a.id] ?? null;
    const ub = unlocked[b.id] ?? null;
    if (ua !== null && ub !== null) return ub - ua;
    if (ua !== null) return -1;
    if (ub !== null) return 1;
    return 0;
  });

  const openDetail = (a: Achievement) => {
    setActive(a);
    setOpen(true);
  };

  return (
    <section className={cn("rounded-2xl border-2 border-border bg-background p-6", className)}>
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Achievements
        </h2>
        <p className="text-xs font-semibold tabular-nums text-muted">
          <span className="text-foreground">{unlockedCount}</span> of{" "}
          {achievements.length}
        </p>
      </header>

      <ul className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(4.75rem,1fr))]">
        {ordered.map((a) => {
          const at = unlocked[a.id] ?? null;
          const isNew = at !== null ? now - at < DAY_MS : false;
          return (
            <li key={a.id}>
              <AchievementMedal
                achievement={a}
                unlockedAt={at}
                isNew={isNew}
                onPress={() => openDetail(a)}
                className="w-full"
              />
            </li>
          );
        })}
      </ul>

      <Modal
        isOpen={open}
        onOpenChange={setOpen}
        size="sm"
        className="rounded-3xl border border-white/[0.04] bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)]"
      >
        {({ close }) =>
          active ? (
            <AchievementDetail
              achievement={active}
              unlockedAt={unlocked[active.id] ?? null}
              onClose={close}
            />
          ) : null
        }
      </Modal>
    </section>
  );
}
