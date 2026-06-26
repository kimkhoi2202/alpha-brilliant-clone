/**
 * AlphaBrilliant — Phase 2 AI backend (Cloud Functions, 2nd gen).
 *
 * Holds the OpenAI key server-side and exposes authenticated callables:
 *   - mintRealtimeToken: short-lived token for the browser realtime voice session
 *   - runTutor:          grounded text hints / personalized explanations
 *   - generateProblem:   verified, schema-valid practice problems (Pillar B)
 *
 * NOTE: handlers are typed skeletons for now; model wiring + the verification
 * firewall land in the next slices (see PRD-phase-2.md §6.3).
 */
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";

initializeApp();

/** Server-side secret — set locally via functions/.env, in prod via Functions secrets. */
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

/** Every AI callable requires a signed-in learner (per-user scoping, like Phase 1). */
function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to use Koji.");
  }
  return uid;
}

/** Mint a short-lived realtime client token for the browser voice session. */
export const mintRealtimeToken = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    const uid = requireUid(request);
    // TODO(voice): call OpenAI Realtime sessions endpoint with OPENAI_API_KEY
    // to mint an ephemeral client secret for gpt-realtime-2; return it to the browser.
    return { ok: true, uid, model: "gpt-realtime-2" };
  },
);

/** Grounded text tutor: progressive hints + personalized wrong-answer explanations. */
export const runTutor = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    const uid = requireUid(request);
    // TODO(tutor): build grounded prompt from request.data (typed lesson state),
    // call gpt-5.5 / gpt-5.4-mini, post-check (no answer leak), return hint/explanation.
    return { ok: true, uid };
  },
);

/** Pillar B: generate a verified, schema-valid practice problem. */
export const generateProblem = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (request) => {
    const uid = requireUid(request);
    // TODO(gen): structured-output generation, answer computed by us (math.js),
    // gradeStep(correctAnswer()) round-trip gate before returning.
    return { ok: true, uid };
  },
);
