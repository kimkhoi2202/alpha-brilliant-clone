/**
 * Per-user cache of pre-generated Infinite Practice problems (Phase 3 batch
 * generation). The pure data layer only — NO React/hooks/UI; the
 * `useInfinitePractice` hook (Task 3) consumes these helpers.
 *
 * One document per user at `users/{uid}/practiceCache/current` holds a FIFO
 * `queue` of already-VERIFIED problems plus the `difficulty` bucket they were
 * generated for. `difficulty` doubles as the invalidation key: when the
 * learner's difficulty changes the consumer regenerates rather than serving a
 * stale bucket.
 *
 * Firestore data is loosely typed, so every read coerces defensively and a
 * missing / malformed doc resolves to `null` (mirrors `lib/learner.tsx`). The
 * owner can already read/write `users/{uid}/**` under the existing security
 * rules, so no rules change is needed.
 */
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import type { ProblemStep } from "../content/types";
import type { GenerationDifficulty } from "./ai/client";
import { db } from "./firebase";

export interface PracticeCache {
  /** The difficulty bucket this queue was generated for (the invalidation key). */
  difficulty: GenerationDifficulty;
  /** Remaining unconsumed, already-verified problems; FIFO (index 0 = next). */
  queue: ProblemStep[];
}

/** The single cache doc for a user. uid is passed in (no React/auth here). */
function cacheRef(uid: string) {
  return doc(db, "users", uid, "practiceCache", "current");
}

/**
 * Narrow a loosely-typed Firestore document into a `PracticeCache`, or `null`
 * when it's missing or malformed: `difficulty` must be one of the known buckets
 * and `queue` must be an array, else the whole cache is rejected. A present-but-
 * empty `queue` is valid and preserved (it is NOT coerced to `null`), so the
 * consumer can distinguish a drained bucket from no cache at all.
 */
function coerceCache(data: Record<string, unknown> | undefined): PracticeCache | null {
  if (!data) return null;
  const { difficulty, queue } = data;
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    return null;
  }
  if (!Array.isArray(queue)) return null;
  return { difficulty, queue: queue as ProblemStep[] };
}

/**
 * One-shot read of the user's practice cache; `null` if missing/malformed, or if
 * the read fails (offline / permission). The consumer treats a failed read like
 * "no cache" and regenerates, mirroring `subscribePracticeCache`'s error→`null`.
 */
export async function readPracticeCache(
  uid: string,
): Promise<PracticeCache | null> {
  try {
    const snap = await getDoc(cacheRef(uid));
    return coerceCache(snap.data() as Record<string, unknown> | undefined);
  } catch {
    return null;
  }
}

/**
 * Persist the user's practice cache, stamping `updatedAt`. The queue is
 * round-tripped through JSON before writing: Firestore rejects `undefined`
 * fields, and this strips any that slipped into a parsed step.
 */
export async function writePracticeCache(
  uid: string,
  cache: PracticeCache,
): Promise<void> {
  await setDoc(cacheRef(uid), {
    difficulty: cache.difficulty,
    queue: JSON.parse(JSON.stringify(cache.queue)) as ProblemStep[],
    updatedAt: serverTimestamp(),
  });
}

/** Delete the user's practice cache (reset / sign-out cleanup). */
export async function clearPracticeCache(uid: string): Promise<void> {
  await deleteDoc(cacheRef(uid));
}
