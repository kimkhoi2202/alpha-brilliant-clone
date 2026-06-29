/**
 * Background pre-warm for the Infinite Practice cache (Phase 3, Pillar B).
 *
 * The first visit to Infinite Practice with a COLD cache pays a visible
 * "Generating a fresh problem…" wait while the loop generates its first batch on
 * the spot. This removes that wait by generating that first batch in the
 * BACKGROUND as soon as Infinite Practice unlocks (on the course map), so the
 * per-user cache is already warm by the time the learner opens practice. The
 * live loop's serve / prefetch / difficulty logic is untouched — this only fills
 * a cold cache ahead of time, reusing the loop's EXACT batch path
 * (`generatePracticeBatch`: `generateProblems` over `ROTATION` → the
 * `verifyGeneratedProblem` filter), so a pre-warmed problem is indistinguishable
 * from a live-generated one.
 *
 * Fire-and-forget and idempotent: it skips when the cache is already warm for the
 * same difficulty, single-flights per uid, swallows all errors, and is AI-off
 * safe (a zero-verified batch writes NOTHING — never an empty/garbage cache).
 */
import type { GenerationDifficulty } from "../../lib/ai/client";
import { readPracticeCache, writePracticeCache } from "../../lib/practice-cache";
import { generatePracticeBatch } from "./practice-batch";

/**
 * uids with a pre-warm in flight — a module-level single-flight guard so a
 * remount / re-render can't kick off a second concurrent generation for the same
 * user (which would double-spend tokens and could clobber the other's write).
 */
const inFlight = new Set<string>();

/**
 * Pre-generate and cache ONE verified batch for `uid` at `difficulty`, but only
 * when the cache is cold for that difficulty. Resolves when done; never rejects.
 *
 * Skip vs. generate:
 *  - SKIP if a pre-warm is already in flight for this uid (single-flight guard).
 *  - SKIP (no clobber) if the existing cache already has a NON-EMPTY queue for
 *    the SAME difficulty — it's already warm, so leave it exactly as is.
 *  - Otherwise GENERATE one batch and write it ONLY if it yields ≥1 verified
 *    problem. A zero-verified batch (AI off / backend down / nothing passed
 *    verification) writes nothing, so the cache is never poisoned with an empty
 *    or garbage queue and the live loop just generates on first visit as today.
 *
 * A difficulty MISMATCH counts as cold and is (re)generated for the current
 * bucket: the loop discards a stale-bucket queue on read anyway, so warming the
 * current bucket is the useful thing to do. Even an over-eager warm can't show a
 * wrong problem — the write still self-invalidates via the difficulty key, and
 * every served problem is re-verified at serve time.
 *
 * Safe to call on every mount: the guards above mean it only does real work when
 * the cache is genuinely cold.
 */
export async function prewarmPracticeCache(
  uid: string,
  difficulty: GenerationDifficulty,
): Promise<void> {
  if (inFlight.has(uid)) return;
  inFlight.add(uid);
  try {
    const cache = await readPracticeCache(uid);
    // Already warm for this difficulty → don't clobber the live queue.
    if (cache && cache.difficulty === difficulty && cache.queue.length > 0) {
      return;
    }
    const queue = await generatePracticeBatch(difficulty, Date.now());
    // AI off / nothing verified → never write an empty/garbage cache.
    if (queue.length === 0) return;
    await writePracticeCache(uid, { difficulty, queue });
  } catch {
    // Fire-and-forget: a failed read / generate / write is a no-op. The live
    // loop will simply generate on first visit exactly as it does today.
  } finally {
    inFlight.delete(uid);
  }
}
