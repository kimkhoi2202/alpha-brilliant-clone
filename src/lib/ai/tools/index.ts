/**
 * The app-tool layer's public entry point (PRD-phase-2 §3.3).
 *
 * Importing this module registers the §3.3 catalog into `appToolRegistry` (as a
 * side effect, in PRD order) and re-exports the framework, the host helpers, and
 * every tool. Consumers — the text agent and the realtime voice agent — should
 * import from here so they get a populated registry.
 */
import { celebrate } from "./celebrate";
import { generatePractice, setDifficulty } from "./practice";
import { goToLesson, resumeLesson } from "./navigation";
import { explainMiss, giveHint } from "./tutor";
import { readProgress } from "./progress";
import { revealSolution } from "./reveal";
import { appToolRegistry, type AnyAppTool } from "./registry";

/** The §3.3 catalog, in PRD order — the single source both agents consume. */
export const appTools = [
  goToLesson,
  resumeLesson,
  giveHint,
  explainMiss,
  generatePractice,
  setDifficulty,
  readProgress,
  revealSolution,
  celebrate,
] as const;

// Populate the app-wide registry once, on first import of the tool layer.
// Idempotent so a dev-HMR re-import can't throw "already registered".
for (const tool of appTools as readonly AnyAppTool[]) {
  if (!appToolRegistry.has(tool.name)) appToolRegistry.register(tool);
}

export * from "./registry";
export * from "./context";
export * from "./difficulty";
export * from "./diagnosis";
export * from "./navigation";
export * from "./tutor";
export * from "./practice";
export * from "./progress";
export * from "./reveal";
export * from "./celebrate";
