/**
 * AlphaBrilliant — Phase 2 AI backend (Cloud Functions, 2nd gen).
 *
 * Holds the OpenAI key server-side (P6) and exposes authenticated callables:
 *   - mintRealtimeToken: short-lived ephemeral token for the realtime voice session
 *   - runTutor:          grounded text hints / personalized explanations
 *   - generateProblem:   verified, schema-valid practice problems (Pillar B)
 *
 * Each handler lives in `src/handlers/*` and requires auth; the OpenAI key is
 * read via `defineSecret("OPENAI_API_KEY")` (the emulator picks up functions/.env).
 * The verification firewall (engine + mathjs) runs in `src/lib/generation.ts`.
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 10 });

export { mintRealtimeToken } from "./handlers/realtime.js";
export { runTutor } from "./handlers/tutor.js";
export { generateProblem } from "./handlers/generate.js";

// Re-export the request/response contracts so the client team can match them.
export type {
  MintRealtimeTokenRequest,
  MintRealtimeTokenResponse,
} from "./handlers/realtime.js";
export type { RunTutorRequest, RunTutorResponse, TutorMode } from "./handlers/tutor.js";
export type {
  GenerateProblemRequest,
  GenerateProblemResponse,
} from "./handlers/generate.js";
export type { GenerableKind, Difficulty } from "./shared/generation.js";
