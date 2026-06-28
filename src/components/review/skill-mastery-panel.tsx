import type { ReactNode } from "react";

import { getSkill, skillsForLevel, type SkillId } from "../../content";
import { cn } from "../../lib/cn";
import {
  MASTERY_LABEL,
  masteryLevelOf,
  masteryProgress,
  type MasteryLevel,
} from "../../lib/learning/mastery";
import { useLearner } from "../../lib/learner";
import { ProgressBar, Tooltip } from "../ui";

export interface SkillMasteryPanelProps {
  /** The level whose skills to show (defaults to the first level). */
  levelId?: string;
  /** Heading (defaults to "Your skills"). */
  title?: string;
  /**
   * Corrective-loop entry: invoked with a skill the learner taps "Practice" on
   * (shown for not-yet-mastered, already-started skills). Omit to hide the action.
   */
  onPractice?: (skill: SkillId) => void;
  /** Optional explainer shown in an info-icon tooltip beside the heading. */
  hint?: ReactNode;
  className?: string;
}

/** Per-level mastery → chip color + class. */
const LEVEL_STYLE: Record<MasteryLevel, { chip: string; intent: "success" | "accent" }> =
  {
    new: { chip: "bg-default text-muted", intent: "accent" },
    learning: { chip: "bg-accent/15 text-accent-soft-foreground", intent: "accent" },
    provisional: {
      chip: "bg-warning/15 text-warning",
      intent: "accent",
    },
    mastered: { chip: "bg-success/15 text-success", intent: "success" },
  };

/**
 * The visible mastery signal (Phase 3, SPOV 6): a per-skill meter that
 * distinguishes **provisional** (passed immediately) from **mastered** (survived
 * a spaced review), so the signal can't be gamed by a single lucky attempt. Doubles
 * as the corrective-loop launcher (a "Practice" action per weak skill).
 */
export function SkillMasteryPanel({
  levelId = "level-1",
  title = "Your skills",
  onPractice,
  hint,
  className,
}: SkillMasteryPanelProps) {
  const { skillMastery } = useLearner();
  const ids = skillsForLevel(levelId);
  if (ids.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-border bg-background p-6",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          {title}
        </p>
        {hint ? (
          <Tooltip
            content={hint}
            placement="top"
            delay={500}
            className="max-w-[260px]"
          >
            <button
              type="button"
              aria-label="How skill mastery works"
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
        ) : null}
      </div>
      <ul className="mt-4 space-y-3.5">
        {ids.map((id) => {
          const skill = getSkill(id);
          const state = skillMastery(id);
          const level = masteryLevelOf(state);
          const style = LEVEL_STYLE[level];
          const canPractice =
            !!onPractice && (level === "learning" || level === "provisional");
          return (
            <li key={id}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {skill?.label ?? id}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      style.chip,
                    )}
                  >
                    {MASTERY_LABEL[level]}
                  </span>
                  {canPractice ? (
                    <button
                      type="button"
                      onClick={() => onPractice?.(id)}
                      className="rounded-md px-1.5 py-0.5 text-xs font-semibold text-accent-soft-foreground transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                    >
                      Practice
                    </button>
                  ) : null}
                </div>
              </div>
              <ProgressBar
                value={masteryProgress(state) * 100}
                intent={style.intent}
                size="sm"
                className="mt-1.5"
                aria-label={`${skill?.label ?? id}: ${MASTERY_LABEL[level]}`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
