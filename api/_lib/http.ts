/**
 * Small HTTP helpers shared by every `/api` route, so the POST-only + auth
 * contract is enforced identically across the three handlers (PRD §3.2, §3.6).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyFirebaseToken } from "./verifyFirebaseToken.js";

/**
 * Narrow `req.body` to `unknown`. Vercel parses an `application/json` request
 * body into an object for us, but we also handle the raw-string case defensively
 * so a parsing quirk can't crash a handler.
 */
export function readJsonBody(req: VercelRequest): unknown {
  const raw: unknown = req.body;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  return raw ?? null;
}

/**
 * Shared gate for every `/api` route: allow only `POST`, and require a valid
 * Firebase ID token. On success returns the verified uid. On failure it has
 * ALREADY written the response (405 for non-POST, 401 for a bad/missing token)
 * and returns `null` — the caller should simply `return`.
 */
export async function guardPost(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return null;
  }

  try {
    return await verifyFirebaseToken(req.headers.authorization);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
}
