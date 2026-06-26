/**
 * Auth guard shared by every AI callable. Phase 1 scopes all data to the
 * signed-in user (`users/{uid}/**`); the AI callables keep that contract.
 */
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

/** Require a signed-in learner; returns their uid or throws `unauthenticated`. */
export function requireUid(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in to use Koji.");
  }
  return uid;
}
