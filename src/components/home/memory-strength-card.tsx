import { useEffect, useState } from "react";

import { getSkill, skillsForLevel, type SkillId } from "../../content";
import { cn } from "../../lib/cn";
import { currentRetrievability } from "../../lib/learning/fsrs";
import { useLearner } from "../../lib/learner";
import { Tooltip } from "../ui";

export interface MemoryStrengthCardProps {
  /** Corrective-loop entry: tap a faded skill to practice it. Omit to keep rows static. */
  onPractice?: (skill: SkillId) => void;
  className?: string;
}

/**
 * Recall band → bar fill + paired text color. The matching `%` text always rides
 * alongside, so the signal reads without relying on color alone.
 */
function recallStyle(recall: number): { fill: string; text: string } {
  if (recall >= 0.7) return { fill: "bg-success", text: "text-success" };
  if (recall >= 0.4) return { fill: "bg-warning", text: "text-warning" };
  return { fill: "bg-danger", text: "text-danger" };
}

/**
 * Home "Memory strength" card: a live FSRS recall meter per started skill, so a
 * learner can spot which ideas are fading and jump straight into practice. The
 * whole card stays hidden until at least one skill has been reviewed, so a
 * brand-new account never sees an empty meter.
 */
export function MemoryStrengthCard({
  onPractice,
  className,
}: MemoryStrengthCardProps) {
  const { skillMastery } = useLearner();

  // A live "now" so recall (and its color band) reflect the present moment and
  // keep ticking while the dashboard is open, mirroring ReviewsCard.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const rows = skillsForLevel("level-1")
    .map((id) => {
      const mastery = skillMastery(id);
      if (!mastery || mastery.memory.lastReviewed === null) return null;
      return {
        id,
        label: getSkill(id)?.label ?? id,
        recall: currentRetrievability(mastery.memory, now),
      };
    })
    .filter(
      (row): row is { id: SkillId; label: string; recall: number } =>
        row !== null,
    );

  // First-run: nothing started yet → hide the card entirely.
  if (rows.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-border bg-background p-6",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Memory strength
        </p>
        <Tooltip
          content="How fresh each idea is. Practice the faded ones before they slip."
          placement="top"
          delay={500}
          className="max-w-[260px]"
        >
          <button
            type="button"
            aria-label="How memory strength works"
            className="inline-flex items-center justify-center rounded-full p-0.5 text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </Tooltip>
      </div>

      <ul className="mt-4 space-y-3.5">
        {rows.map(({ id, label, recall }) => {
          const pct = Math.max(0, Math.min(100, Math.round(recall * 100)));
          const style = recallStyle(recall);
          const meter = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {label}
                </span>
                <span className={cn("text-sm font-bold tabular-nums", style.text)}>
                  {pct}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label} memory strength`}
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-default"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                    style.fill,
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          );

          return (
            <li key={id}>
              {onPractice ? (
                <button
                  type="button"
                  onClick={() => onPractice(id)}
                  aria-label={`Practice ${label}, ${pct}% recall`}
                  className="-mx-2 block w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {meter}
                </button>
              ) : (
                meter
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
