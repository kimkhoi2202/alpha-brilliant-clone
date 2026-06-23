import type { ReactNode } from "react";

import { cn } from "../../lib/cn";
import { LessonNode, type LessonNodeState } from "./lesson-node";
import { PathConnector } from "./path-connector";

export interface CourseMapNode {
  id: string;
  label: string;
  state?: LessonNodeState;
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

/** Vertical learning path: header, lesson nodes + connectors, anchored card. */
export function CourseMap({ header, nodes, footer, className }: CourseMapProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {header ? <div className="mb-8">{header}</div> : null}
      <ol className="flex flex-col">
        {nodes.map((node, i) => (
          <li key={node.id} className="flex flex-col">
            <LessonNode
              label={node.label}
              state={node.state}
              icon={node.icon}
              onPress={node.onPress}
            />
            {i < nodes.length - 1 ? <PathConnector /> : null}
          </li>
        ))}
      </ol>
      {footer ? <div className="mt-8">{footer}</div> : null}
    </div>
  );
}
