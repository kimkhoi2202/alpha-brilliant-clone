/**
 * The app-tool layer's public entry point (PRD-phase-2 §3.3).
 *
 * Exports the §3.3 catalog as the `appTools` array (in PRD order) — the single
 * source both agents consume — plus the framework, the host helpers, and every
 * tool. Consumers (the text agent and the realtime voice agent) import from here.
 */
import { celebrate } from "./celebrate";
import { generatePractice, setDifficulty } from "./practice";
import { goToLesson, resumeLesson } from "./navigation";
import { explainMiss, giveHint } from "./tutor";
import { readProgress } from "./progress";
import { revealSolution } from "./reveal";

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
