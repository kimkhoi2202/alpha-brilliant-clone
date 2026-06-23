import {
  Leaderboard,
  LeagueCard,
  StreakCard,
  type LeaderboardEntry,
} from "../../components/gamification";
import { Avatar, Button, Modal } from "../../components/ui";
import { Section, Subhead } from "../Section";

const days = [
  { label: "Th", state: "completed" as const },
  { label: "F", state: "completed" as const },
  { label: "S", state: "current" as const },
  { label: "Su", state: "upcoming" as const },
  { label: "M", state: "upcoming" as const },
];

const entries: LeaderboardEntry[] = [
  { rank: 1, name: "Priya", xp: 980 },
  { rank: 2, name: "Marcus", xp: 845 },
  { rank: 3, name: "Sam", xp: 720, you: true },
  { rank: 4, name: "Lena", xp: 690 },
  { rank: 5, name: "Diego", xp: 540 },
];

export function Gamification() {
  return (
    <Section
      id="gamification"
      title="Gamification"
      description="Streaks, leagues, leaderboards, and avatars. Illustrations are placeholders."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Subhead>Streak card</Subhead>
          <StreakCard
            count={2}
            message="Solve 3 problems to keep your streak."
            days={days}
          />
        </div>
        <div>
          <Subhead>League card — locked</Subhead>
          <LeagueCard
            variant="locked"
            title="Unlock Leagues"
            subtitle="Earn XP to join a league"
            progress={{ current: 40, total: 175 }}
          />
        </div>
      </div>

      <Subhead className="mt-6">League card — active</Subhead>
      <div className="max-w-md">
        <LeagueCard
          variant="active"
          title="Hydrogen League"
          subtitle="Top 15 advance · 3 days left"
        >
          <Leaderboard entries={entries} advanceCount={3} />
        </LeagueCard>
      </div>

      <Subhead className="mt-6">Avatars</Subhead>
      <div className="flex items-center gap-3">
        <Avatar name="Priya" size="sm" />
        <Avatar name="Marcus" />
        <Avatar name="Sam" size="lg" />
        <Avatar name="Lena" />
        <Avatar name="Diego" size="sm" />
      </div>

      <Subhead className="mt-6">Leagues modal (live)</Subhead>
      <Modal size="md" trigger={<Button variant="outline">Open leagues</Button>}>
        <div className="space-y-4 p-6">
          <h3 className="text-center text-lg font-bold text-foreground">
            Hydrogen League
          </h3>
          <p className="text-center text-sm text-muted">
            Top 15 advance · 3 days left
          </p>
          <Leaderboard entries={entries} advanceCount={3} />
        </div>
      </Modal>
    </Section>
  );
}
