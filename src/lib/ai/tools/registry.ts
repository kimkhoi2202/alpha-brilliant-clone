/**
 * Typed app-tool registry (PRD-phase-2 §3.3 "the app-control surface").
 *
 * This module owns the *framework*: the `ToolContext` Koji's tools run against,
 * the `AppTool` shape, the `defineTool` identity helper, and the registry that
 * stores the catalog. The §3.3 catalog itself (goToLesson / resumeLesson,
 * giveHint, explainMiss, generatePractice, setDifficulty, readProgress,
 * revealSolution, celebrate) lives in sibling files and is registered into
 * `appToolRegistry` via `./index`. Every tool is Zod-validated so the agent's
 * arguments are checked before a handler runs (P3).
 *
 * The `ToolContext` is deliberately UI-framework-agnostic: it is a set of plain
 * interfaces (no JSX, no React, no router types) so the lesson player, the text
 * agent, and the realtime voice agent can each construct one and the same tools
 * drive all three surfaces.
 */
import type { z } from "zod";

import type { AnswerValue, LessonId, Step } from "../../../content/types";
import type { Grounding } from "../grounding";
import type {
  LearnerProfile,
  LessonProgress,
  LessonStatus,
  Recommendation,
  StepRecord,
} from "../../learner";

// ---------------------------------------------------------------------------
// Navigation — a UI-agnostic destination the host maps to its router.
// ---------------------------------------------------------------------------

/**
 * Where a navigation tool wants to take the learner. The host (lesson player /
 * agent shell) implements `ToolContext.navigate` by mapping these to its router,
 * so the tools never import a router type. Unknown targets may be no-ops on
 * surfaces that don't have them yet (e.g. "infinite-practice" before Pillar B).
 */
export type NavigationTarget =
  | { to: "lesson"; lessonId: LessonId; stepIndex?: number }
  | { to: "course-map" }
  | { to: "infinite-practice" }
  | { to: "profile" };

// ---------------------------------------------------------------------------
// Learner — the read/write slice of the learner store the tools need.
// ---------------------------------------------------------------------------

/**
 * The learner surface the tools read (progress / streak) and write
 * (`recordStep`, used by `revealSolution` to mark a step `assisted`). It is a
 * structural subset of `LearnerContextValue`, so the host can pass the value
 * from `useLearner()` directly.
 */
export interface LearnerToolApi {
  /** Profile carrying streak + XP, or null when signed out. */
  readonly profile: LearnerProfile | null;
  /** Per-lesson progress map (read-only mastery signal). */
  readonly progress: Record<string, LessonProgress>;
  lessonStatus(id: LessonId): LessonStatus;
  resumeIndex(id: LessonId): number;
  needsReview(id: LessonId): boolean;
  recommendation(): Recommendation;
  /** Ensure a lesson's progress doc exists (no-op if already started). */
  startLesson(id: LessonId): Promise<void>;
  /** Persist a `StepRecord`; `revealSolution` uses this to set `assisted`. */
  recordStep(id: LessonId, record: StepRecord & { stepId: string }): Promise<void>;
}

// ---------------------------------------------------------------------------
// Step — the current step plus its typed `Grounding` (P2: structured state).
// ---------------------------------------------------------------------------

/**
 * The step the learner is on, the typed materials grounded tools need, and a
 * `grounding()` accessor that returns the structured payload for the tutor
 * callable (null for concept steps, which aren't graded). Built from typed
 * content/progress state only — never from rendered DOM/KaTeX (P2).
 *
 * Hosts should construct this with `createStepContext` (see `./context`) so the
 * grounding is built consistently via `buildGrounding`.
 */
export interface ToolStepContext {
  /** The lesson the step belongs to (for `recordStep` / navigation). */
  readonly lessonId: LessonId;
  /** The current step (concept or problem). */
  readonly step: Step;
  /** The learner's in-progress answer for this step, or null. */
  readonly answer: AnswerValue | null;
  /** The learner's `StepRecord` for this step so far, if any. */
  readonly record: StepRecord | null;
  /** Structured grounding for a problem step, or null for a concept step. */
  grounding(): Grounding | null;
}

// ---------------------------------------------------------------------------
// Koji reactions — the imperative mascot handle (structural, no JSX).
// ---------------------------------------------------------------------------

/**
 * The mascot reaction handle Koji's `celebrate` tool fires. Structurally
 * identical to the lesson player's `KojiHandle`, so the host passes that ref's
 * current value directly — but declared here so the tools layer never imports a
 * component. Null when no mascot is mounted (the tool degrades to a no-op).
 */
export interface KojiReactions {
  /** Random success celebration (e.g. first-try correct). */
  success(): void;
  /** Sympathetic bounce on a wrong attempt. */
  incorrect(): void;
  /** Reassuring beat when the learner gets it right after a miss. */
  correctAfterIncorrect(): void;
  /** Goodbye wave; `onDone` fires once the wave finishes. */
  wave(onDone?: () => void): void;
}

// ---------------------------------------------------------------------------
// Engagement — has the learner engaged Koji on *this* step? (reveal gate)
// ---------------------------------------------------------------------------

/**
 * The per-step engagement signal that, together with a genuine attempt, unlocks
 * `revealSolution` (§2.3). "Engaged Koji" means a Koji hint OR a conversation —
 * deliberately distinct from the static `StepRecord.hintsUsed` flag (which also
 * covers the plain "Try again" path) so unlocking the reveal requires really
 * working *with* Koji. The host owns the lifecycle and resets it per step;
 * Koji's hint/explain tools call the `mark*` writers as they run.
 */
export interface EngagementSignal {
  /** True once a Koji hint (giveHint/explainMiss) has been delivered this step. */
  hasUsedHint(): boolean;
  /** True once the learner has conversed with Koji (text or voice) this step. */
  hasTalkedToKoji(): boolean;
  /** Record that a Koji hint/explanation was delivered for the current step. */
  markHintUsed(): void;
  /** Record that the learner has conversed with Koji on the current step. */
  markTalkedToKoji(): void;
}

// ---------------------------------------------------------------------------
// ToolContext — everything a client-side tool needs to drive the app.
// ---------------------------------------------------------------------------

/**
 * Context handed to every tool handler at run time. Constructed by the host
 * surface (lesson player / text agent / voice agent) and shared by all tools,
 * so one catalog drives every surface.
 */
export interface ToolContext {
  /** Mirrors `aiEnabled()`; handlers must no-op safely when false. */
  readonly aiEnabled: boolean;
  /** Drive course navigation (the host maps targets to its router). */
  navigate(target: NavigationTarget): void | Promise<void>;
  /** Read progress / streak and persist step records. */
  readonly learner: LearnerToolApi;
  /** The current step + its grounding, or null when not in a lesson. */
  readonly step: ToolStepContext | null;
  /** The mascot reaction handle, or null when no mascot is mounted. */
  readonly koji: KojiReactions | null;
  /** Per-step "has the learner engaged Koji?" signal (drives the reveal gate). */
  readonly engagement: EngagementSignal;
}

// ---------------------------------------------------------------------------
// AppTool — a single Zod-validated, typed app-control tool.
// ---------------------------------------------------------------------------

/**
 * A single app-control tool exposed to Koji (text + voice agents):
 *   - `name`        unique id the agent calls (e.g. "giveHint")
 *   - `description` agent-facing summary of what it does
 *   - `parameters`  Zod schema validating the agent's arguments
 *   - `handler`     runs the tool with validated, typed args + context
 *
 * `args` is parsed against `parameters` before `handler` runs, so a handler can
 * trust the shape of its `args`.
 */
export interface AppTool<Schema extends z.ZodType = z.ZodType, Result = unknown> {
  readonly name: string;
  readonly description: string;
  readonly parameters: Schema;
  readonly handler: (args: z.infer<Schema>, ctx: ToolContext) => Result | Promise<Result>;
}

/** A type-erased tool, safe to store heterogeneously in the registry. */
export type AnyAppTool = AppTool<z.ZodType, unknown>;

/**
 * Identity helper that preserves a tool's precise argument/result types at the
 * definition site (full inference from its Zod schema) while still producing a
 * value the registry can store. The tools-engineer authors tools with this.
 */
export function defineTool<Schema extends z.ZodType, Result>(
  tool: AppTool<Schema, Result>,
): AppTool<Schema, Result> {
  return tool;
}

/** The typed registry interface the tools-engineer populates. */
export interface ToolRegistry {
  /** Register a tool. Throws if a tool with the same name already exists. */
  register<Schema extends z.ZodType, Result>(tool: AppTool<Schema, Result>): void;
  /** Look a tool up by name. */
  get(name: string): AnyAppTool | undefined;
  /** Whether a tool with this name is registered. */
  has(name: string): boolean;
  /** All registered tools, in registration order. */
  list(): readonly AnyAppTool[];
}

/** Create a fresh, empty registry (handy for tests or isolated agents). */
export function createToolRegistry(): ToolRegistry {
  const byName = new Map<string, AnyAppTool>();

  return {
    register<Schema extends z.ZodType, Result>(tool: AppTool<Schema, Result>): void {
      if (byName.has(tool.name)) {
        throw new Error(`Tool "${tool.name}" is already registered`);
      }
      // Erase the precise generic so heterogeneous tools share one map. Safe:
      // callers validate `args` via `tool.parameters` before invoking `handler`.
      byName.set(tool.name, tool as unknown as AnyAppTool);
    },
    get(name: string): AnyAppTool | undefined {
      return byName.get(name);
    },
    has(name: string): boolean {
      return byName.has(name);
    },
    list(): readonly AnyAppTool[] {
      return [...byName.values()];
    },
  };
}

/**
 * The app-wide tool registry. It is populated with the §3.3 catalog as a side
 * effect of importing `./index` (the canonical entry point for consumers); see
 * that barrel for the registration. Importing this file alone yields the empty
 * framework only.
 */
export const appToolRegistry: ToolRegistry = createToolRegistry();
