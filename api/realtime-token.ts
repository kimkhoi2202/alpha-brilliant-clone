/**
 * POST /api/realtime-token — mint a short-lived realtime client secret for the
 * browser voice session (PRD §3.2, §4.1), so the long-lived OpenAI key never
 * leaves the server (P6).
 *
 * Ported from `functions/src/handlers/realtime.ts` (Firebase callable → Vercel
 * Node serverless). The ephemeral-token mint is preserved exactly; it reuses the
 * same realtime model id (`gpt-realtime-2`, overridable via OPENAI_REALTIME_MODEL).
 *
 * Contract (matches src/lib/ai/client.ts): 200 JSON
 *   `{ token: string | null, model: string | null, expiresAt: number | null }`
 *   where `expiresAt` is epoch SECONDS (as the original callable returned).
 *
 * OpenAI endpoint (verified against openai@6.45.0):
 *   POST /v1/realtime/client_secrets  ⇢  client.realtime.clientSecrets.create()
 *
 * The response's `value` (looks like `ek_...`) is the ephemeral token; we return
 * ONLY that (plus non-secret metadata) to the browser — never the API key.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getOpenAI, realtimeModel } from "./_lib/openai.js";
import { guardPost, readJsonBody } from "./_lib/http.js";

/** Koji's voice persona/grounding for the realtime session. */
const KOJI_VOICE_INSTRUCTIONS = [
  "You are Koji, a warm, encouraging math tutor inside a learn-by-doing",
  "Pythagorean-theorem course. Always speak and respond in English.",
  "Keep replies short and spoken-friendly.",
  "You can see the lesson's structured state and call the app's tools to act",
  "(navigate, give a hint, explain a miss, generate practice, reveal a worked",
  "solution). Never just read out a final numeric answer in a hint — guide the",
  "learner to it. Only reveal a worked solution after a genuine attempt.",
].join(" ");

/** Default realtime client-secret lifetime (seconds). Range 10–7200; default 600. */
const TOKEN_TTL_SECONDS = 600;

export interface MintRealtimeTokenResponse {
  /** The ephemeral client secret (`ek_...`) — safe to hand to the browser. */
  token: string;
  /** Expiry of the client secret, in seconds since epoch. */
  expiresAt: number;
  /** Realtime model the session is configured for. */
  model: string;
}

/** Read the optional `voice` override from the request body, else a warm default. */
function readVoice(body: unknown): string {
  if (typeof body === "object" && body !== null && "voice" in body) {
    const voice = (body as Record<string, unknown>).voice;
    if (typeof voice === "string" && voice.length > 0) return voice;
  }
  return "marin";
}

/** Mint the ephemeral client secret (thin HTTP wrapper below). */
async function mintRealtimeToken(voice: string): Promise<MintRealtimeTokenResponse> {
  const client = getOpenAI();
  const model = realtimeModel();

  const created = await client.realtime.clientSecrets.create({
    expires_after: { anchor: "created_at", seconds: TOKEN_TTL_SECONDS },
    session: {
      type: "realtime",
      model,
      instructions: KOJI_VOICE_INSTRUCTIONS,
      audio: { output: { voice } },
    },
  });

  // Return ONLY the ephemeral token + non-secret metadata (never the API key).
  return {
    token: created.value,
    expiresAt: created.expires_at,
    model,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const uid = await guardPost(req, res);
  if (uid === null) return;

  const voice = readVoice(readJsonBody(req));

  try {
    const result = await mintRealtimeToken(voice);
    res.status(200).json(result);
  } catch (err) {
    console.error("mintRealtimeToken failed", err);
    res.status(500).json({ error: "Realtime token mint failed." });
  }
}
