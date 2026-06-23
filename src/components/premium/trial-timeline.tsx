import { Fragment } from "react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

export interface TrialNode {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export interface TrialTimelineProps {
  nodes: TrialNode[];
  className?: string;
}

/** Horizontal trial timeline (Today / In 5 days / In 7 days). */
export function TrialTimeline({ nodes, className }: TrialTimelineProps) {
  return (
    <div className={cn("flex items-start", className)}>
      {nodes.map((n, i) => (
        <Fragment key={i}>
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            <span
              className="grid size-12 place-items-center rounded-full bg-accent-soft text-2xl"
              aria-hidden
            >
              {n.icon ?? "✦"}
            </span>
            <p className="text-sm font-bold text-foreground">{n.title}</p>
            {n.description ? (
              <p className="text-xs text-muted">{n.description}</p>
            ) : null}
          </div>
          {i < nodes.length - 1 ? (
            <span className="mt-6 h-px flex-1 bg-border" aria-hidden />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
