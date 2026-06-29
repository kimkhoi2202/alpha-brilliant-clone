import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { AppHeader, toStreakDays } from "../components/chrome";
import { StreakCard } from "../components/gamification";
import {
  AchievementsShelf,
  ActivityHeatmap,
  CoursePeekCard,
  HomeHero,
  LeagueSection,
  MemoryStrengthCard,
  StatStrip,
} from "../components/home";
import { ReviewsCard } from "../components/review";
import { course, getLesson, lessonOrder, type SkillId } from "../content";
import { lastNDays, today } from "../lib/date";
import { requestLessonIntro } from "../lib/lesson-transition";
import { useLearner, type Recommendation } from "../lib/learner";

const LEVEL_ID = "level-1";

/** The recommendation's CTA label. */
const ACTION_LABEL: Record<Recommendation["kind"], string> = {
  start: "Start lesson",
  continue: "Continue",
  review: "Review",
  done: "Review",
};

function greetingFor(name: string): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

/** A short momentum line under the greeting, derived from the learner's state. */
function subtitleFor(opts: {
  kind: Recommendation["kind"];
  streak: number;
  doneToday: boolean;
  hasProgress: boolean;
}): string {
  if (opts.kind === "done") {
    return "You've finished the chapter. Keep your skills sharp with a review.";
  }
  if (opts.streak > 0 && !opts.doneToday) {
    return `On a ${opts.streak}-day streak. One lesson keeps it alive.`;
  }
  if (opts.doneToday) return "You've practiced today. Keep the momentum going.";
  if (opts.hasProgress) return "Pick up where you left off.";
  return "Let's start the chapter. Discover why a² + b² = c².";
}

function HomeSkeleton() {
  return (
    <div className="space-y-10" aria-hidden>
      <div className="h-44 animate-pulse rounded-2xl bg-surface" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}

/** The signed-in learner Home: a daily cockpit (Phase 3). */
export function HomeScreen() {
  const navigate = useNavigate();
  const {
    loading,
    profile,
    recommendation,
    lessonStatus,
    levelMastery,
    dueReviews,
    todayActivity,
    weeklyXp,
    weekActivity,
    activityFor,
  } = useLearner();

  // A live clock (refreshed slowly) drives review due-counts without calling an
  // impure function during render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:pt-10">
          <HomeSkeleton />
        </main>
      </div>
    );
  }

  const name = profile?.displayName?.trim().split(/\s+/)[0] ?? "";
  const rec = recommendation();
  const recLesson = getLesson(rec.lessonId);
  const streak = profile?.currentStreak ?? 0;
  const goal = profile?.dailyGoalXp ?? 30;
  const todayXp = todayActivity().xp;

  const gate = levelMastery(LEVEL_ID);
  const completedLessons = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;
  const hasProgress = completedLessons > 0 || rec.kind === "continue";
  const reviewsDue = dueReviews(now).length;

  const streakDays = toStreakDays(weekActivity(), today());
  const streakMessage =
    todayXp > 0
      ? "Nice work today."
      : streak > 0
        ? "Practice today to keep your streak."
        : "Start a streak today.";

  const openRecommended = () => {
    requestLessonIntro(rec.lessonId);
    void navigate({ to: "/lesson/$lessonId", params: { lessonId: rec.lessonId } });
  };
  const reviewSkill = (skill: SkillId) =>
    void navigate({ to: "/reviews", search: { skill } });

  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:pt-10">
        <div className="space-y-10">
          <HomeHero
            greeting={greetingFor(name)}
            subtitle={subtitleFor({
              kind: rec.kind,
              streak,
              doneToday: todayXp > 0,
              hasProgress,
            })}
            courseTitle={course.title}
            level="Level 1"
            actionLabel={ACTION_LABEL[rec.kind]}
            nextLessonLabel={recLesson?.title}
            onPrimary={openRecommended}
            goalCurrent={todayXp}
            goal={goal}
          />

          <StatStrip
            streak={streak}
            longest={profile?.longestStreak ?? 0}
            weekXp={weeklyXp()}
            mastered={gate.mastered}
            totalSkills={gate.total}
            reviewsDue={reviewsDue}
          />

          {/* Widget board (masonry): cards flow into balanced columns so short
              widgets like spaced review and the streak pack tightly together
              instead of leaving empty space beside taller cards. Cards that
              self-hide when empty (reviews, memory) simply drop out. */}
          <div className="columns-1 gap-6 sm:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
            <ReviewsCard
              onStart={() => void navigate({ to: "/reviews", search: {} })}
            />
            <StreakCard
              count={streak}
              message={streakMessage}
              days={streakDays}
            />
            <MemoryStrengthCard onPractice={reviewSkill} />
            <LeagueSection />
            <AchievementsShelf />
          </div>

          {/* Activity and the course glance share one row at equal height
              (pulled out of the masonry so the two line up). */}
          <div className="grid gap-6 sm:grid-cols-2 sm:items-stretch">
            <ActivityHeatmap
              className="h-full"
              days={activityFor(lastNDays(42))}
            />
            <CoursePeekCard
              className="h-full"
              title={course.title}
              completedLessons={completedLessons}
              totalLessons={lessonOrder.length}
              mastered={gate.mastered}
              totalSkills={gate.total}
              onOpen={() => void navigate({ to: "/courses" })}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
