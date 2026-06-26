/**
 * `mintRealtimeToken` — mint a short-lived realtime client secret for the
 * browser voice session (PRD §3.2, §4.1), so the long-lived OpenAI key never
 * leaves the server (P6).
 *
 * OpenAI endpoint (verified against the installed SDK, openai@6.45.0):
 *   POST /v1/realtime/client_secrets  ⇢  client.realtime.clientSecrets.create()
 *   (see node_modules/openai/resources/realtime/client-secrets.d.ts)
 *
 * This is the current GA path; the older `/v1/realtime/sessions` (beta) is
 * superseded. The response's `value` (looks like `ek_...`) is the ephemeral
 * token; we return ONLY that (plus non-secret metadata) to the browser.
 */
import { onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "../shared/secrets.js";
import { MODELS } from "../shared/openai.js";
import { requireUid } from "../shared/auth.js";
import { trackUsage } from "../shared/usage.js";

/** Koji's voice persona/grounding for the realtime session. */
const KOJI_VOICE_INSTRUCTIONS = [
  "You are Koji, a warm, encouraging math tutor inside a learn-by-doing",
  "Pythagorean-theorem course. Keep replies short and spoken-friendly.",
  "You can see the lesson's structured state and call the app's tools to act",
  "(navigate, give a hint, explain a miss, generate practice, reveal a worked",
  "solution). Never just read out a final numeric answer in a hint — guide the",
  "learner to it. Only reveal a worked solution after a genuine attempt.",
].join(" ");

/** Default realtime client-secret lifetime (seconds). Range 10–7200; default 600. */
const TOKEN_TTL_SECONDS = 600;

export interface MintRealtimeTokenRequest {
  /** Optional voice override (e.g. "marin", "cedar"). Defaults to a warm voice. */
  voice?: string;
}

export interface MintRealtimeTokenResponse {
  /** The ephemeral client secret (`ek_...`) — safe to hand to the browser. */
  token: string;
  /** Expiry of the client secret, in seconds since epoch. */
  expiresAt: number;
  /** Realtime model the session is configured for. */
  model: string;
}

export const mintRealtimeToken = onCall<MintRealtimeTokenRequest>(
  { secrets: [OPENAI_API_KEY] },
  async (request): Promise<MintRealtimeTokenResponse> => {
    const uid = requireUid(request);
    const voice = request.data?.voice ?? "marin";

    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });

    const created = await client.realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: TOKEN_TTL_SECONDS },
      session: {
        type: "realtime",
        model: MODELS.realtime,
        instructions: KOJI_VOICE_INSTRUCTIONS,
        audio: { output: { voice } },
      },
    });

    await trackUsage(uid, "realtimeTokensMinted");

    // Return ONLY the ephemeral token + non-secret metadata (never the API key).
    return {
      token: created.value,
      expiresAt: created.expires_at,
      model: MODELS.realtime,
    };
  },
);
