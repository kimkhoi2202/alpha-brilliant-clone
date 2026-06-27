/**
 * Firebase ID-token verification firewall for the `/api` routes.
 *
 * Replaces the Cloud Functions auth guard (`functions/src/shared/auth.ts`,
 * which trusted `request.auth.uid` populated by the callable runtime). Here we
 * receive a raw `Authorization: Bearer <Firebase ID token>` header, so we must
 * verify the JWT ourselves with `jose`:
 *
 *   - signature: against Google's public JWKS for Firebase ID tokens
 *     (https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com),
 *     cached via `createRemoteJWKSet`
 *   - issuer:    `https://securetoken.google.com/<projectId>`
 *   - audience:  `<projectId>` (the Firebase project id, from FIREBASE_PROJECT_ID)
 *   - expiry:    `exp` is checked automatically by `jwtVerify`
 *
 * Returns the verified `uid` (`sub` claim) or throws — callers map any throw to
 * a 401 (the client then degrades gracefully to static hints / feedback, P5).
 */
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Google's public JWKS for Firebase ID tokens, as a JSON Web Key Set.
 * `createRemoteJWKSet` fetches + caches the keys (and refetches on key
 * rotation), so this is created once per warm serverless instance.
 */
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

/** The Firebase project id used for the token's `iss`/`aud` assertions. */
function projectId(): string {
  const pid = process.env.FIREBASE_PROJECT_ID;
  if (!pid) {
    throw new Error("FIREBASE_PROJECT_ID is not configured");
  }
  return pid;
}

/** Extract the bearer token from an `Authorization` header, or null. */
function bearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer (.+)$/.exec(header.trim());
  return match?.[1]?.trim() ?? null;
}

/**
 * Verify a Firebase ID token from the request's `Authorization` header and
 * return the learner's uid. Throws on a missing/malformed/invalid/expired
 * token (callers map this to a 401).
 */
export async function verifyFirebaseToken(
  authorization: string | undefined,
): Promise<string> {
  const token = bearerToken(authorization);
  if (!token) {
    throw new Error("Missing Bearer token");
  }

  const pid = projectId();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${pid}`,
    audience: pid,
  });

  const uid = payload.sub;
  if (!uid) {
    throw new Error("Token has no subject (uid)");
  }
  return uid;
}
