/**
 * Per-learner AI usage counters (PRD §3.5, §6.4).
 *
 * Written to `users/{uid}/aiUsage/{YYYY-MM-DD}` via firebase-admin. There are no
 * app-level caps initially (owner's call) — we only *track* so caps can be
 * switched on later without a redesign. Writes are best-effort: a tracking
 * failure must never break the user-facing AI call.
 */
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/** Counter fields we increment on the daily usage doc. */
export type UsageField =
  | "realtimeTokensMinted"
  | "tutorHints"
  | "tutorExplains"
  | "problemsGenerated"
  | "problemsRejected";

/** UTC `YYYY-MM-DD` bucket key (one usage doc per learner per day). */
function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Increment a usage counter for `uid` in today's bucket. Best-effort:
 * resolves even if the write fails (logs and swallows the error).
 */
export async function trackUsage(
  uid: string,
  field: UsageField,
  by = 1,
): Promise<void> {
  try {
    const date = dayKey();
    const ref = getFirestore()
      .collection("users")
      .doc(uid)
      .collection("aiUsage")
      .doc(date);
    await ref.set(
      {
        uid,
        date,
        [field]: FieldValue.increment(by),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (err) {
    console.error(`trackUsage failed (uid=${uid}, field=${field})`, err);
  }
}
