/**
 * The app-tool layer's public entry point (PRD-phase-2 §3.3).
 *
 * Exports the §3.3 catalog as the `appTools` array (in PRD order) — the single
 * source both agents consume — plus the framework, the host helpers, and every
 * tool. Consumers (the text agent and the realtime voice agent) import from here.
 */
import {
  clearAnnotations,
  highlightElement,
  labelElement,
  listCanvasTargets,
  pointToElement,
  prefillAnswer,
} from "./canvas";
import { celebrate } from "./celebrate";
import { generatePractice, setDifficulty } from "./practice";
import { goToLesson, resumeLesson } from "./navigation";
import { explainMiss, giveHint } from "./tutor";
import { readProgress } from "./progress";
import { readState } from "./read-state";
import { revealSolution } from "./reveal";

/**
 * The §3.3 catalog, in PRD order — the single source both agents consume. The
 * canvas-control tools sit with the tutor tools (giveHint / explainMiss): they
 * are the "show, don't just say" half of hinting — Koji lists the figure's
 * parts, then highlights / labels / points / prefills to guide attention.
 *
 * `readState` leads the tutor cluster: Koji senses the learner's LIVE answer (and
 * whether it's right yet) before deciding how to hint and what to highlight.
 */
export const appTools = [
  goToLesson,
  resumeLesson,
  readState,
  giveHint,
  explainMiss,
  listCanvasTargets,
  highlightElement,
  labelElement,
  pointToElement,
  clearAnnotations,
  prefillAnswer,
  generatePractice,
  setDifficulty,
  readProgress,
  revealSolution,
  celebrate,
] as const;

export * from "./registry";
export * from "./canvas";
export * from "./context";
export * from "./difficulty";
export * from "./diagnosis";
export * from "./navigation";
export * from "./tutor";
export * from "./practice";
export * from "./progress";
export * from "./read-state";
export * from "./reveal";
export * from "./celebrate";
