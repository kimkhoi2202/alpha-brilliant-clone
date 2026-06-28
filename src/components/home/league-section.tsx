import { useState } from "react";

import {
  Leaderboard,
  LeagueCard,
  type LeaderboardEntry,
} from "../gamification";
import { Button, Modal } from "../ui";
import { useLearner } from "../../lib/learner";

export interface LeagueSectionProps {
  className?: string;
}

/** How many standings to show inline before the "view full" affordance. */
const INLINE_COUNT = 6;

/** Home league card: this week's standings inline, full board behind a modal. */
export function LeagueSection({ className }: LeagueSectionProps) {
  const { leagueState } = useLearner();
  // A mount-time clock keeps the render pure (the standings don't change second
  // to second; navigating back to Home refreshes them).
  const [now] = useState(() => Date.now());
  const state = leagueState(now);

  // members arrive pre-ranked (descending), so the index is the rank.
  const entries: LeaderboardEntry[] = state.members.map((m, i) => ({
    rank: i + 1,
    name: m.name,
    xp: m.xp,
    you: m.you,
  }));
  const top = entries.slice(0, INLINE_COUNT);

  const title = `${state.tierName} League`;
  const subtitle = `Top ${state.advanceCount} advance · ${state.daysLeft} day${
    state.daysLeft === 1 ? "" : "s"
  } left`;

  return (
    <LeagueCard
      variant="active"
      title={title}
      subtitle={subtitle}
      className={className}
    >
      <Leaderboard entries={top} advanceCount={state.advanceCount} />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted">
          This week&rsquo;s league · {entries.length} learners
        </p>
        <Modal
          size="md"
          trigger={
            <Button variant="ghost" size="sm">
              View full standings
            </Button>
          }
        >
          <div className="space-y-4 p-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
            </div>
            <Leaderboard entries={entries} advanceCount={state.advanceCount} />
            <p className="text-center text-xs text-muted">
              A weekly practice cohort that resets every Monday.
            </p>
          </div>
        </Modal>
      </div>
    </LeagueCard>
  );
}
