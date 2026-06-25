import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { getLesson, lessonOrder, problemCount } from "../content";
import type { LessonId } from "../content/types";
import { useAuth } from "./AuthContext";
import { today, yesterday } from "./date";
import { db } from "./firebase";

export type LessonStatus = "locked" | "available" | "in_progress" | "completed";

export interface StepRecord {
  attempts: number;
  correct: boolean;
  hintsUsed: boolean;
  firstTryCorrect: boolean;
}

export interface LessonProgress {
  status: "in_progress" | "completed";
  currentStepIndex: number;
  steps: Record<string, StepRecord>;
}

export interface LearnerProfile {
  displayName: string;
  email: string;
  photoURL: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalXp: number;
}

export interface Recommendation {
  lessonId: LessonId;
  kind: "start" | "continue" | "review" | "done";
}

export interface LearnerContextValue {
  loading: boolean;
  profile: LearnerProfile | null;
  progress: Record<string, LessonProgress>;
  lessonStatus: (id: LessonId) => LessonStatus;
  resumeIndex: (id: LessonId) => number;
  needsReview: (id: LessonId) => boolean;
  recommendation: () => Recommendation;
  startLesson: (id: LessonId) => Promise<void>;
  setStepIndex: (id: LessonId, index: number) => Promise<void>;
  recordStep: (
    id: LessonId,
    record: StepRecord & { stepId: string },
  ) => Promise<void>;
  completeLesson: (id: LessonId, xpEarned: number) => Promise<void>;
  /** Wipe all lesson progress so every lesson is available again (keeps XP/streak). */
  resetProgress: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | undefined>(undefined);

// --- coercion helpers (Firestore data is loosely typed) ---
const asStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const asNum = (v: unknown, fallback = 0): number =>
  typeof v === "number" ? v : fallback;

export function LearnerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      const d = (snap.data() ?? {}) as Record<string, unknown>;
      setProfile({
        displayName: asStr(d.displayName),
        email: asStr(d.email),
        photoURL: asStr(d.photoURL),
        currentStreak: asNum(d.currentStreak),
        longestStreak: asNum(d.longestStreak),
        lastActiveDate:
          typeof d.lastActiveDate === "string" ? d.lastActiveDate : null,
        totalXp: asNum(d.totalXp),
      });
      setProfileLoaded(true);
    });

    const progressCol = collection(db, "users", uid, "progress");
    const unsubProgress = onSnapshot(progressCol, (snap) => {
      const map: Record<string, LessonProgress> = {};
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        map[docSnap.id] = {
          status: d.status === "completed" ? "completed" : "in_progress",
          currentStepIndex: asNum(d.currentStepIndex),
          steps: (d.steps as Record<string, StepRecord>) ?? {},
        };
      });
      setProgress(map);
      setProgressLoaded(true);
    });

    return () => {
      unsubUser();
      unsubProgress();
    };
  }, [uid]);

  const markActiveToday = useCallback(async () => {
    if (!uid) return;
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    const d = (snap.data() ?? {}) as Record<string, unknown>;
    const last = typeof d.lastActiveDate === "string" ? d.lastActiveDate : null;
    const t = today();
    if (last === t) return;
    const current = last === yesterday() ? asNum(d.currentStreak) + 1 : 1;
    const longest = Math.max(asNum(d.longestStreak), current);
    await setDoc(
      userRef,
      { currentStreak: current, longestStreak: longest, lastActiveDate: t },
      { merge: true },
    );
  }, [uid]);

  const startLesson = useCallback(
    async (id: LessonId) => {
      if (!uid) return;
      const ref = doc(db, "users", uid, "progress", id);
      const snap = await getDoc(ref);
      if (snap.exists()) return; // keep existing progress / completion
      await setDoc(
        ref,
        {
          status: "in_progress",
          currentStepIndex: 0,
          startedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [uid],
  );

  // Never writes `status`, so it can't downgrade a completed lesson on replay.
  const setStepIndex = useCallback(
    async (id: LessonId, index: number) => {
      if (!uid) return;
      await setDoc(
        doc(db, "users", uid, "progress", id),
        { currentStepIndex: index, updatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [uid],
  );

  const recordStep = useCallback(
    async (id: LessonId, record: StepRecord & { stepId: string }) => {
      if (!uid) return;
      const { stepId, ...rest } = record;
      await setDoc(
        doc(db, "users", uid, "progress", id),
        { steps: { [stepId]: rest }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      await markActiveToday();
    },
    [uid, markActiveToday],
  );

  const completeLesson = useCallback(
    async (id: LessonId, xpEarned: number) => {
      if (!uid) return;
      const lesson = getLesson(id);
      await setDoc(
        doc(db, "users", uid, "progress", id),
        {
          status: "completed",
          currentStepIndex: lesson?.steps.length ?? 0,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      if (xpEarned > 0) {
        await setDoc(
          doc(db, "users", uid),
          { totalXp: increment(xpEarned) },
          { merge: true },
        );
      }
      await markActiveToday();
    },
    [uid, markActiveToday],
  );

  const resetProgress = useCallback(async () => {
    if (!uid) return;
    await Promise.all(
      lessonOrder.map((id) =>
        deleteDoc(doc(db, "users", uid, "progress", id)),
      ),
    );
  }, [uid]);

  // --- derived selectors (read current `progress` state) ---
  // Every lesson is freely accessible (no sequential locking): a lesson is
  // only ever completed, in progress, or available.
  function lessonStatus(id: LessonId): LessonStatus {
    const p = progress[id];
    if (p?.status === "completed") return "completed";
    return p?.status === "in_progress" ? "in_progress" : "available";
  }

  function resumeIndex(id: LessonId): number {
    const p = progress[id];
    if (!p || p.status === "completed") return 0;
    return p.currentStepIndex;
  }

  function needsReview(id: LessonId): boolean {
    const p = progress[id];
    const lesson = getLesson(id);
    if (!p || p.status !== "completed" || !lesson) return false;
    const total = problemCount(lesson);
    if (total === 0) return false;
    const firstTry = Object.values(p.steps).filter(
      (s) => s.firstTryCorrect,
    ).length;
    return firstTry / total < 0.5;
  }

  function recommendation(): Recommendation {
    for (const id of lessonOrder) {
      if (lessonStatus(id) === "in_progress") return { lessonId: id, kind: "continue" };
    }
    for (const id of lessonOrder) {
      if (lessonStatus(id) === "available") return { lessonId: id, kind: "start" };
    }
    for (const id of lessonOrder) {
      if (needsReview(id)) return { lessonId: id, kind: "review" };
    }
    return { lessonId: lessonOrder[lessonOrder.length - 1], kind: "done" };
  }

  const value: LearnerContextValue = {
    loading: uid ? !profileLoaded || !progressLoaded : false,
    // Present empty state when signed out, regardless of any stale snapshot.
    profile: uid ? profile : null,
    progress: uid ? progress : {},
    lessonStatus,
    resumeIndex,
    needsReview,
    recommendation,
    startLesson,
    setStepIndex,
    recordStep,
    completeLesson,
    resetProgress,
  };

  return (
    <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLearner(): LearnerContextValue {
  const ctx = useContext(LearnerContext);
  if (!ctx) throw new Error("useLearner must be used within a LearnerProvider");
  return ctx;
}
