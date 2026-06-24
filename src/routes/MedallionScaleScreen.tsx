import { Link } from "@tanstack/react-router";

import { LessonProgressMedallion } from "../components/course";

const COUNTS = Array.from({ length: 20 }, (_, index) => index + 1);

/**
 * Unguarded visual sandbox for the lesson-progress medallion. Renders the real
 * component for every total from 1–20 (each roughly half complete) so the
 * segment spacing can be eyeballed across the whole range. Parked at
 * /medallions; no sign-in required.
 */
export function MedallionScaleScreen() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <main className="mx-auto max-w-6xl space-y-10 px-5 py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Visual sandbox
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Lesson progress medallion: segment spacing
          </h1>
          <p className="max-w-2xl text-muted">
            The real{" "}
            <code className="rounded bg-surface px-1.5 py-0.5 text-sm">
              LessonProgressMedallion
            </code>{" "}
            rendered for every total from 1 to 20, each about half complete so
            both filled and empty gaps are visible. Use this to check that the
            gaps stay clearly separated at low counts without swallowing the arcs
            at high counts.
          </p>
          <p className="text-sm text-muted">
            <Link to="/components" className="underline hover:text-foreground">
              ← Back to component library
            </Link>
          </p>
        </header>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {COUNTS.map((total) => {
            const completed = Math.ceil(total / 2);
            return (
              <li
                key={total}
                className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/40 p-4"
              >
                <LessonProgressMedallion current={completed} total={total} />
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  total = {total}
                </span>
                <span className="text-xs text-muted">
                  {completed} of {total} filled
                </span>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
