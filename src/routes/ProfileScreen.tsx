import { useNavigate } from "@tanstack/react-router";

import { AppHeader } from "../components/chrome";
import { Button } from "../components/ui";
import { course, getLesson, lessonOrder } from "../content";
import type { LessonStatus } from "../lib/learner";
import { useAuth } from "../lib/AuthContext";
import { useStreak } from "../hooks/useStreak";
import { useLearner } from "../lib/learner";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  );
}

const STATUS_BADGE: Record<LessonStatus, { label: string; className: string }> = {
  completed: {
    label: "Completed",
    className: "bg-success-soft text-success-soft-foreground",
  },
  in_progress: {
    label: "In progress",
    className: "bg-accent-soft text-accent-soft-foreground",
  },
  available: { label: "Available", className: "bg-default text-foreground" },
  locked: { label: "Locked", className: "bg-default text-muted" },
};

export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile, lessonStatus } = useLearner();
  const { currentStreak, longestStreak } = useStreak();

  const name = profile?.displayName || user?.displayName || "Learner";
  const email = profile?.email || user?.email || "";
  const xp = profile?.totalXp ?? 0;
  const completed = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6">
        <header className="flex items-center gap-4">
          <div
            className="grid size-16 place-items-center rounded-full bg-accent text-2xl font-bold text-accent-foreground"
            aria-hidden
          >
            {initial}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
            {email ? <p className="truncate text-muted">{email}</p> : null}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Day streak" value={currentStreak} />
          <Stat label="Longest" value={longestStreak} />
          <Stat label="Total XP" value={xp} />
          <Stat label="Lessons" value={`${completed}/${lessonOrder.length}`} />
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">{course.title}</h2>
          <ul className="overflow-hidden rounded-2xl border border-border">
            {lessonOrder.map((id, i) => {
              const lesson = getLesson(id);
              const status = lessonStatus(id);
              const badge = STATUS_BADGE[status];
              const clickable = status !== "locked";
              return (
                <li
                  key={id}
                  className={i > 0 ? "border-t border-border" : undefined}
                >
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() =>
                      navigate({
                        to: "/lesson/$lessonId",
                        params: { lessonId: id },
                      })
                    }
                    className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:hover:bg-surface"
                  >
                    <span
                      className={
                        status === "locked"
                          ? "font-medium text-muted"
                          : "font-medium text-foreground"
                      }
                    >
                      {lesson?.title ?? id}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <Button variant="outline" onPress={() => void logout()}>
          Sign out
        </Button>
      </main>
    </div>
  );
}
