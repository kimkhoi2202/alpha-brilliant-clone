/**
 * Typed app-tool registry (PRD-phase-2 §3.3 "the app-control surface").
 *
 * This is the *shape* only — the registry ships EMPTY. The tools-engineer
 * populates it in a later slice with the catalog: goToLesson / resumeLesson,
 * giveHint, explainMiss, generatePractice, setDifficulty, readProgress,
 * revealSolution, celebrate. Every tool is Zod-validated so the agent's
 * arguments are checked before a handler runs (P3).
 */
import type { z } from "zod";

/**
 * Context handed to every tool handler at run time. Intentionally minimal for
 * the foundation: the tools-engineer extends it with the lesson-player hooks,
 * learner progress, navigation, and the Koji callable client as tools land.
 */
export interface ToolContext {
  /** Mirrors `aiEnabled()`; handlers must no-op safely when false. */
  readonly aiEnabled: boolean;
}

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
 * The app-wide tool registry — EMPTY for now. The tools-engineer registers the
 * §3.3 catalog here in a later slice.
 */
export const appToolRegistry: ToolRegistry = createToolRegistry();
