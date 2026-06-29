/**
 * The Infinite Practice loop, now BATCH-backed by a per-user Firestore cache
 * (Phase 3, building on PRD-phase-2 §4.2, Pillar B).
 *
 * Instead of generating one problem at a time, we ask the server for a whole
 * BATCH (one per interaction kind in `ROTATION`) and cache the verified results
 * per user (`lib/practice-cache.ts`). The hook then serves problems straight
 * from that queue, prefetches the next batch when it runs low, and regenerates
 * when the learner's difficulty bucket changes. Because the queue persists in
 * Firestore, leftovers survive a reload / a switch to another device — on mount
 * we just re-serve where the learner was.
 *
 * The verification firewall still rules (P4 "the AI never emits a wrong
 * answer"): `generateProblems` returns UNVERIFIED candidates, so EVERY problem —
 * freshly generated OR loaded from the cache — is re-run through
 * `verifyGeneratedProblem` at the moment it is served. Nothing unverified ever
 * reaches state, so the renderer only sees a problem the pure engine + `math.js`
 * already certified.
 *
 * This hook assumes AI is enabled; mount it only behind `aiEnabled()` so the
 * AI-off path never runs the loop (`generateProblems` would otherwise just
 * return its safe empty batch and we'd surface the graceful "error" state).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import type { InteractionKind, ProblemStep } from "../../content/types";
import {
  generateProblems,
  type GeneratableInteractionKind,
  type GenerationDifficulty,
} from "../../lib/ai/client";
import { verifyGeneratedProblem } from "../../lib/ai/verify";
import { readPracticeCache, writePracticeCache } from "../../lib/practice-cache";
import { useAuth } from "../../lib/AuthContext";
import { ROTATION, verifyBatch } from "./practice-batch";

/**
 * Prefetch the next batch once the queue (including the on-screen problem) has
 * shrunk to this many — a small buffer so `next()` almost always serves an
 * already-warm, already-verified problem instantly instead of awaiting a fetch.
 */
const PREFETCH_THRESHOLD = 2;

export type PracticeStatus = "loading" | "ready" | "error";

export interface InfinitePracticeState {
  status: PracticeStatus;
  /** The current VERIFIED problem (tagged `source:"ai"`), or null while loading. */
  problem: ProblemStep | null;
  /** Interaction kind of the current problem (for the header / debugging). */
  kind: GeneratableInteractionKind | null;
  /** Monotonic id of the current problem — use as a React `key` to remount. */
  token: number;
  /** Request the next problem (drives the endless loop). */
  next: () => void;
}

/** Narrow a served step's interaction kind to the generatable subset (for `kind`). */
function asGeneratableKind(kind: InteractionKind): GeneratableInteractionKind | null {
  return (ROTATION as readonly string[]).includes(kind)
    ? (kind as GeneratableInteractionKind)
    : null;
}

/**
 * Drive the cache-backed generate → verify → serve loop.
 *
 * Control flow:
 *  - On mount / when the uid arrives, read the cache. A queue whose `difficulty`
 *    matches the current param is served from (re-verifying the front); anything
 *    else (no cache / difficulty mismatch / drained) triggers a fresh batch.
 *  - `next()` drops the finished front, persists, and serves the new front;
 *    when the queue empties it regenerates.
 *  - A background prefetch tops the queue up before it runs dry, without
 *    disturbing the on-screen problem.
 *  - A difficulty change keeps the current problem on screen but discards the
 *    rest of the (now stale-bucket) queue and refills at the new difficulty, so
 *    the NEXT problem reflects it — mirroring the old loop's "applies to the next
 *    problem, not the current one" rule.
 *
 * Staleness is handled with monotonic ids: `requestRef` supersedes foreground
 * loads (StrictMode double-invoke, rapid `next()`), `bgGenRef` supersedes
 * background fills, and both check the live difficulty before applying — so a
 * fill that started at the old difficulty is dropped when it returns.
 */
export function useInfinitePractice(
  difficulty: GenerationDifficulty,
): InfinitePracticeState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [status, setStatus] = useState<PracticeStatus>("loading");
  const [problem, setProblem] = useState<ProblemStep | null>(null);
  const [token, setToken] = useState(0);

  // The working queue — index 0 is the on-screen problem, 1.. are upcoming. It
  // mirrors the Firestore cache, which we re-persist after every mutation.
  const queueRef = useRef<ProblemStep[]>([]);
  // The difficulty bucket `queueRef` belongs to (the cache's invalidation key).
  const activeDifficultyRef = useRef<GenerationDifficulty | null>(null);

  // Latest uid / difficulty, so the stable callbacks below read them without
  // being torn down and recreated on every change.
  const uidRef = useRef<string | null>(uid);
  const difficultyRef = useRef<GenerationDifficulty>(difficulty);

  // Foreground (loading/regenerating) supersession + StrictMode de-dupe.
  const requestRef = useRef(0);
  const foregroundInFlightRef = useRef(false);
  const foregroundDifficultyRef = useRef<GenerationDifficulty | null>(null);

  // Background (prefetch / difficulty refill) supersession + single-flight guard.
  const bgGenRef = useRef(0);
  const bgInFlightRef = useRef(false);

  // Distinct, fresh seed per batch (point 3). Lazily time-seeded on first use
  // (so sessions differ), then monotonic; `Date.now()` runs inside `nextSeed`,
  // never during render — which `react-hooks/purity` forbids.
  const seedRef = useRef(0);

  // True only while THIS hook instance is mounted. Re-armed at the top of the
  // orchestrator effect (so StrictMode's mount→unmount→remount re-enables it)
  // and cleared in that effect's cleanup. Guards every post-await application
  // point below, so a resolution arriving after this instance unmounted can't
  // apply state or clobber the remounted instance's Firestore cache.
  const mountedRef = useRef(false);

  // --- persistence -----------------------------------------------------------

  /** Mirror the in-memory queue to the per-user cache (best-effort). */
  const persistQueue = useCallback((): void => {
    const currentUid = uidRef.current;
    const currentDifficulty = activeDifficultyRef.current;
    if (!currentUid || !currentDifficulty) return;
    void writePracticeCache(currentUid, {
      difficulty: currentDifficulty,
      queue: queueRef.current,
    }).catch(() => {
      // A failed write is non-fatal: the in-memory queue still serves this
      // session, and the next `next()` / prefetch write re-syncs the cache.
    });
  }, []);

  /**
   * A fresh, distinct seed per batch — time-seeded on first use, then advanced by
   * `ROTATION.length` so consecutive batches' seed ranges don't overlap (the
   * server fans one batch out to per-kind seeds `base + i` for i in
   * 0..ROTATION.length-1).
   */
  const nextSeed = useCallback((): number => {
    if (seedRef.current === 0) seedRef.current = Date.now();
    const seed = seedRef.current;
    seedRef.current += ROTATION.length;
    return seed;
  }, []);

  // --- serving (the single P4 chokepoint) ------------------------------------

  /**
   * Serve the front of the queue, RE-VERIFYING it first (P4). A front that fails
   * verification is dropped and the next tried — so a stale / malformed cached
   * step never renders. Returns false when nothing in the queue verifies (the
   * caller then regenerates). Mutates `queueRef` when it drops; the caller
   * persists.
   */
  const serveFront = useCallback((): boolean => {
    // Don't apply to an unmounted instance: a post-await caller could still
    // reach here after a real unmount→remount, where the remounted instance owns
    // state now (defense-in-depth with the per-call supersession checks).
    if (!mountedRef.current) return false;
    while (queueRef.current.length > 0) {
      const front = queueRef.current[0];
      if (verifyGeneratedProblem(front).ok) {
        setProblem(front);
        setToken((t) => t + 1);
        setStatus("ready");
        return true;
      }
      if (import.meta.env.DEV) {
        console.warn("[infinite-practice] dropping unverifiable queued problem");
      }
      queueRef.current = queueRef.current.slice(1);
    }
    return false;
  }, []);

  // --- background fill (prefetch + difficulty refill) ------------------------

  /**
   * Generate another batch in the background and APPEND the verified results to
   * the queue (the on-screen problem is untouched — no spinner). Used both to
   * prefetch when the queue runs low and to refill after a difficulty change.
   * Drops its result if a newer fill, a foreground load, or a difficulty change
   * superseded it while it was in flight.
   */
  const startBackgroundFill = useCallback((): void => {
    if (!uidRef.current) return; // no uid → can't persist; `next()` will foreground-generate
    const bgId = ++bgGenRef.current;
    const startReq = requestRef.current;
    const startDifficulty = difficultyRef.current;
    const seed = nextSeed();
    bgInFlightRef.current = true;
    void (async () => {
      // `generateProblems` is AI-off / failure safe — it returns an empty batch
      // rather than throwing, so no try/catch is needed here.
      const { steps } = await generateProblems({
        kinds: [...ROTATION],
        difficulty: startDifficulty,
        seed,
      });
      // A newer background fill owns the slot now; let it manage everything.
      if (bgGenRef.current !== bgId) return;
      bgInFlightRef.current = false;
      // A foreground load replaced the queue, or the difficulty moved on — this
      // batch is stale (point 6: compare difficulty before applying).
      if (requestRef.current !== startReq) return;
      if (difficultyRef.current !== startDifficulty) return;
      // Unmounted while generating → don't append/persist; the remounted
      // instance owns the queue + cache now.
      if (!mountedRef.current) return;
      const verified = verifyBatch(steps);
      if (verified.length === 0) return;
      queueRef.current = [...queueRef.current, ...verified];
      activeDifficultyRef.current = startDifficulty;
      persistQueue();
    })();
  }, [nextSeed, persistQueue]);

  /** Prefetch the next batch once the queue runs low and nothing is in flight. */
  const maybePrefetch = useCallback((): void => {
    if (!uidRef.current) return;
    if (bgInFlightRef.current) return;
    if (queueRef.current.length > PREFETCH_THRESHOLD) return;
    startBackgroundFill();
  }, [startBackgroundFill]);

  // --- foreground generation (shows the loading state) -----------------------

  /**
   * Generate a fresh batch for `requestId`, replacing the queue and serving its
   * front. Zero verified (backend off/failing) surfaces the graceful "error"
   * state. Drops its result if superseded by a newer foreground load.
   */
  const runForegroundGenerate = useCallback(
    async (requestId: number, targetDifficulty: GenerationDifficulty): Promise<void> => {
      // `generateProblems` never throws (AI-off / failure safe): it returns an
      // empty batch, which we surface as the graceful "error" state below.
      const { steps } = await generateProblems({
        kinds: [...ROTATION],
        difficulty: targetDifficulty,
        seed: nextSeed(),
      });
      // Drop if a newer load superseded us, or this instance unmounted while
      // generating (a real unmount→remount would otherwise let us clobber the
      // remounted instance's state + cache).
      if (!mountedRef.current || requestRef.current !== requestId) return;
      foregroundInFlightRef.current = false;
      const verified = verifyBatch(steps);
      if (verified.length === 0) {
        // Nothing verifiable → graceful error. We deliberately leave the cache
        // untouched here: a previously-persisted (possibly good) batch isn't
        // clobbered with nothing, and the difficulty key + re-verify make any
        // now-stale doc self-invalidating on the next read.
        setStatus("error");
        return;
      }
      queueRef.current = verified;
      activeDifficultyRef.current = targetDifficulty;
      serveFront();
      persistQueue();
      maybePrefetch();
    },
    [nextSeed, serveFront, persistQueue, maybePrefetch],
  );

  /**
   * Start a foreground load: optionally try the cache first (mount / uid
   * arrival), then fall back to generating. `useCache` is false when `next()`
   * has drained our own queue — re-reading our just-emptied cache would be
   * pointless, so we generate directly.
   */
  const startForeground = useCallback(
    (useCache: boolean): void => {
      const currentUid = uidRef.current;
      if (!currentUid) return; // gated route provides uid; the effect re-runs when it arrives
      const requestId = ++requestRef.current;
      const targetDifficulty = difficultyRef.current;
      foregroundInFlightRef.current = true;
      foregroundDifficultyRef.current = targetDifficulty;
      void (async () => {
        if (useCache) {
          const cache = await readPracticeCache(currentUid);
          // Superseded by a newer load, or unmounted while reading → bail before
          // touching state / the queue / the cache.
          if (!mountedRef.current || requestRef.current !== requestId) return;
          if (
            cache &&
            cache.difficulty === targetDifficulty &&
            cache.queue.length > 0
          ) {
            const beforeLength = cache.queue.length;
            queueRef.current = [...cache.queue];
            activeDifficultyRef.current = cache.difficulty;
            if (serveFront()) {
              foregroundInFlightRef.current = false;
              // Persist only if serving pruned an unverifiable leftover.
              if (queueRef.current.length !== beforeLength) persistQueue();
              maybePrefetch();
              return;
            }
            // Nothing in the cached queue verified → generate a fresh batch.
          }
        }
        await runForegroundGenerate(requestId, targetDifficulty);
      })();
    },
    [serveFront, persistQueue, maybePrefetch, runForegroundGenerate],
  );

  // --- public: advance to the next problem -----------------------------------

  const next = useCallback((): void => {
    // Drop the just-finished problem from the front.
    if (queueRef.current.length > 0) {
      queueRef.current = queueRef.current.slice(1);
    }
    // Serve the new front if the queue still has a verifiable problem.
    if (queueRef.current.length > 0 && serveFront()) {
      persistQueue();
      maybePrefetch();
      return;
    }
    // Drained (empty, or everything left failed re-verification) → regenerate.
    // No need to re-check `foregroundInFlightRef` here: `startForeground` bumps
    // `requestRef`, which supersedes any in-flight foreground load OR background
    // fill (each compares `requestRef` before applying its result).
    setStatus("loading");
    setProblem(null);
    startForeground(false);
  }, [serveFront, persistQueue, maybePrefetch, startForeground]);

  // --- orchestration: mount, uid arrival, and difficulty changes -------------

  useEffect(() => {
    // Re-arm on every (re)mount — including StrictMode's mount→unmount→remount,
    // where this body runs AGAIN after the cleanup below. (Initializing once and
    // only clearing in cleanup would leave it false for the real mount, which
    // would suppress the legitimate first serve.)
    mountedRef.current = true;
    uidRef.current = uid;
    difficultyRef.current = difficulty;

    // Wait for auth (the gated route supplies a uid within moments; this effect
    // re-runs when it arrives, until then we stay in `loading`). The branches are
    // nested rather than early-returned so the cleanup is ALWAYS registered.
    if (uid) {
      if (queueRef.current.length > 0) {
        // We already have a problem in hand; a matching difficulty means nothing
        // changed. Otherwise the difficulty changed mid-problem:
        if (activeDifficultyRef.current !== difficulty) {
          // Keep the CURRENT problem on screen, discard the rest of the (now
          // stale-bucket) queue, and refill at the new difficulty in the
          // background so the NEXT problem reflects it. An in-flight fill started
          // at the old difficulty is dropped on return.
          //
          // The persisted cache then becomes `{difficulty:new, queue:[old-bucket
          // problem, …new]}`, so on a later resume that still-re-verified
          // old-bucket problem can show once before the next advance. That's the
          // intended "current stays, NEXT changes" behavior, not a stale bug.
          queueRef.current = queueRef.current.slice(0, 1);
          activeDifficultyRef.current = difficulty;
          startBackgroundFill();
        }
      } else if (
        // No problem yet (first mount, uid just arrived, or the queue drained):
        // serve from cache or generate. Skip if an identical load is already in
        // flight (StrictMode double-invokes this effect).
        !(
          foregroundInFlightRef.current &&
          foregroundDifficultyRef.current === difficulty
        )
      ) {
        startForeground(true);
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [uid, difficulty, startForeground, startBackgroundFill]);

  // `kind` is DERIVED from the served problem (parallel state would only risk
  // drifting from it). The route consumer doesn't read it, but the public
  // interface still exposes it for the header / debugging.
  const kind = problem ? asGeneratableKind(problem.interaction.kind) : null;

  return { status, problem, kind, token, next };
}
