import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { LessonNode, type LessonNodeState } from "./lesson-node";

export interface CourseMapNode {
  id: string;
  label: string;
  state?: LessonNodeState;
  /** Selected node (drives the glow ring). */
  selected?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
}

export interface CourseMapProps {
  /** Optional banner (e.g. <LevelHeader />). */
  header?: ReactNode;
  nodes: CourseMapNode[];
  /** Optional anchored card (e.g. <CurrentLessonCard />). */
  footer?: ReactNode;
  className?: string;
}

/** Horizontal meander amount (px) per node: a gentle wave, like Brilliant's
 *  path, instead of a straight line. The pucks stay a column; only the offset
 *  shifts. Labels sit to the right, so we bias the wave rightward. */
function meander(i: number): number {
  return Math.round((Math.sin(i * 0.9 - 1.1) + 1) * 28);
}

/** Brilliant's learning path: a level banner, a meandering column of 3D lesson
 *  pucks, and an anchored current-lesson card. */
export function CourseMap({ header, nodes, footer, className }: CourseMapProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {header ? <div className="mb-8">{header}</div> : null}
      <ol className="flex flex-col gap-6 pl-4">
        {nodes.map((node, i) => (
          <li
            key={node.id}
            className="transition-transform duration-300"
            style={{ transform: `translateX(${meander(i)}px)` }}
          >
            <LessonNode
              label={node.label}
              state={node.state}
              selected={node.selected}
              icon={node.icon}
              onPress={node.onPress}
            />
          </li>
        ))}
      </ol>
      {footer ? <div className="mt-10">{footer}</div> : null}
    </div>
  );
}
