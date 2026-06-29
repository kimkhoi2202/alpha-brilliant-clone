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

import {
  course,
  getLesson,
  getQuiz,
  isReviewLesson,
  lessonForSkill,
  lessonOrder,
  lessonXp,
  levelForLesson,
  levelIndex,
  problemCount,
  skillForLessonStep,
  skillOrder,
  skillsForLevel,
} from "../content";
import type { LessonId, SkillId } from "../content";
import { currentRetrievability } from "./learning/fsrs";
import {
  applyOutcome,
  masteryLevelOf,
  newSkillMastery,
  type MasteryLevel,
  type SkillMastery,
  type SkillOutcome,
} from "./learning/mastery";
import {
  DEFAULT_DAILY_GOAL_XP,
  REVIEW_XP,
  emptyActivity,
  type DailyActivity,
} from "./learning/activity";
import { unlockedIds, type AchievementFacts } from "./learning/achievements";
import { buildLeague, type LeagueState } from "./learning/league";
import { useAuth } from "./AuthContext";
import { today, yesterday, weekStart, lastNDays, daysLeftInWeek } from "./date";
import { db } from "./firebase";
import { clearPracticeCache } from "./practice-cache";

export type LessonStatus = "locked" | "available" | "in_progress" | "completed";

export interface StepRecord {
  attempts: number;
  correct: boolean;
  hintsUsed: boolean;
  firstTryCorrect: boolean;
  /** Set when the learner used Koji's reveal-solution (Phase 2); excluded from mastery. */
  assisted?: boolean;
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
  /** Daily XP target for the Home goal ring. */
  dailyGoalXp: number;
}

export interface Recommendation {
  lessonId: LessonId;
  kind: "start" | "continue" | "review" | "done";
}

/** Aggregate mastery for a level's skills (drives the gate + meters). */
export interface LevelMastery {
  total: number;
  mastered: number;
  provisional: number;
  learning: number;
  /** True iff every skill in the level is mastered (the level gate). */
  allMastered: boolean;
  skills: { id: SkillId; level: MasteryLevel }[];
}

export type { SkillMastery, MasteryLevel, SkillOutcome };
export type { DailyActivity };

export interface LearnerContextValue {
  loading: boolean;
  /** True once lesson progress has hydrated; drives the course-map "you are here" marker. */
  progressLoaded: boolean;
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
    record: StepRecord & { stepId: string; skill?: SkillId },
  ) => Promise<void>;
  completeLesson: (id: LessonId, xpEarned: number) => Promise<void>;
  /** Wipe all lesson progress so every lesson is available again (keeps XP/streak). */
  resetProgress: () => Promise<void>;

  // --- Phase 3: per-skill mastery + spaced repetition ---
  /** Per-skill mastery state (FSRS memory + mastery level), or null if untouched. */
  skillMastery: (id: SkillId) => SkillMastery | null;
  /** Skills whose spaced review is due now, most urgent (lowest recall) first. */
  dueReviews: (now: number) => SkillId[];
  /** The soonest upcoming review time among not-yet-due skills (for the forecast). */
  nextReviewAt: (now: number) => number | null;
  /** Aggregate mastery for a level (drives the gate + meters). */
  levelMastery: (levelId: string) => LevelMastery;
  /** Record a spaced-review / practice outcome into a skill's FSRS memory. */
  recordReview: (skillId: SkillId, outcome: SkillOutcome) => Promise<void>;

  // --- Phase 3: Home cockpit (daily activity, goal, achievements, league) ---
  /** Today's activity totals (zeros if nothing yet). */
  todayActivity: () => DailyActivity;
  /** The last 7 days of activity, oldest first (zero-filled). */
  weekActivity: () => DailyActivity[];
  /** XP earned so far this (Monday-based) week. */
  weeklyXp: () => number;
  /** Activity for an explicit list of dates (zero-filled), oldest first. */
  activityFor: (dates: string[]) => DailyActivity[];
  /** Set the learner's daily XP goal. */
  setDailyGoal: (xp: number) => Promise<void>;
  /** A facts snapshot used to evaluate achievement predicates. */
  achievementFacts: () => AchievementFacts;
  /** Map of unlocked achievement id → unlock epoch-ms. */
  unlockedAchievements: () => Record<string, number>;
  /** This week's league standings (synthetic cohort + the learner's live XP). */
  leagueState: (now: number) => LeagueState;

  /**
   * DEV-only: pull every reviewed skill's clock back so its review is due now,
   * letting QA exercise the full spaced-mastery loop without waiting real days.
   */
  devMakeReviewsDue: () => Promise<void>;
  /**
   * DEV-only: finish the whole course exactly as a human would have — every
   * lesson completed (each problem first-try-correct), every skill mastered (as
   * if it survived a spaced review), and the user's XP + streak set to match.
   */
  devCompleteAllLessons: () => Promise<void>;
  /**
   * DEV-only: simulate completing a spaced-review session without the review UI —
   * apply `correct` first-try-correct passes then `wrong` lapses across the
   * currently-due skills (round-robin), each through the exact same `recordReview`
   * path a real review uses, so FSRS memory + mastery update identically. No-op
   * when nothing is due.
   */
  devSimulateReview: (counts: {
    correct: number;
    wrong: number;
  }) => Promise<void>;
  /**
   * DEV-only: simulate completing the end-of-level Level Review without the quiz
   * UI — apply `correct` first-try-correct passes then `wrong` lapses across the
   * Level Review's skills (round-robin, via the same `recordReview` path), then
   * mark the "level-review" lesson completed exactly as a real completion does
   * (`completeLesson`). Idempotent once the Level Review is already completed.
   */
  devSimulateLevelReview: (counts: {
    correct: number;
    wrong: number;
  }) => Promise<void>;
}

/** The end-of-level review lesson; completing it unlocks Infinite Practice. */
const LEVEL_REVIEW_LESSON_ID: LessonId = "level-review";
/** XP per correct answer in the quiz-only Level Review (mirrors lesson-runner). */
const QUIZ_QUESTION_XP = 15;

const LearnerContext = createContext<LearnerContextValue | undefined>(undefined);

// --- coercion helpers (Firestore data is loosely typed) ---
const asStr = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const asNum = (v: unknown, fallback = 0): number =>
  typeof v === "number" ? v : fallback;
const asNumOrNull = (v: unknown): number | null =>
  typeof v === "number" ? v : null;

const MASTERY_LEVELS: readonly MasteryLevel[] = [
  "new",
  "learning",
  "provisional",
  "mastered",
];

/** SkillMastery → flat Firestore document. */
function serializeSkill(s: SkillMastery): Record<string, unknown> {
  return {
    difficulty: s.memory.difficulty,
    stability: s.memory.stability,
    lastReviewed: s.memory.lastReviewed,
    dueAt: s.memory.dueAt,
    masteryLevel: s.masteryLevel,
    masteredAt: s.masteredAt,
    provisional: s.provisional,
    reviews: s.reviews,
    lapses: s.lapses,
  };
}

/** Flat Firestore document → SkillMastery. */
function deserializeSkill(d: Record<string, unknown>): SkillMastery {
  const level = MASTERY_LEVELS.includes(d.masteryLevel as MasteryLevel)
    ? (d.masteryLevel as MasteryLevel)
    : "new";
  return {
    memory: {
      difficulty: asNum(d.difficulty),
      stability: asNum(d.stability),
      lastReviewed: asNumOrNull(d.lastReviewed),
      dueAt: asNum(d.dueAt),
    },
    masteryLevel: level,
    masteredAt: asNumOrNull(d.masteredAt),
    provisional: d.provisional === true,
    reviews: asNum(d.reviews),
    lapses: asNum(d.lapses),
  };
}

export function LearnerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [skills, setSkills] = useState<Record<string, SkillMastery>>({});
  const [activity, setActivity] = useState<Record<string, DailyActivity>>({});
  const [achievementsUnlocked, setAchievementsUnlocked] = useState<
    Record<string, number>
  >({});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [skillsLoaded, setSkillsLoaded] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);

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
        dailyGoalXp: asNum(d.dailyGoalXp, DEFAULT_DAILY_GOAL_XP),
      });
      setProfileLoaded(true);
    }, () => setProfileLoaded(true));

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
    }, () => setProgressLoaded(true));

    const skillCol = collection(db, "users", uid, "skillMastery");
    const unsubSkills = onSnapshot(skillCol, (snap) => {
      const map: Record<string, SkillMastery> = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = deserializeSkill(
          docSnap.data() as Record<string, unknown>,
        );
      });
      setSkills(map);
      setSkillsLoaded(true);
    }, () => setSkillsLoaded(true));

    const activityCol = collection(db, "users", uid, "activity");
    const unsubActivity = onSnapshot(activityCol, (snap) => {
      const map: Record<string, DailyActivity> = {};
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        map[docSnap.id] = {
          date: docSnap.id,
          xp: asNum(d.xp),
          lessonsCompleted: asNum(d.lessonsCompleted),
          problemsSolved: asNum(d.problemsSolved),
          reviewsDone: asNum(d.reviewsDone),
        };
      });
      setActivity(map);
      setActivityLoaded(true);
    }, () => setActivityLoaded(true));

    const achievementsCol = collection(db, "users", uid, "achievements");
    const unsubAchievements = onSnapshot(achievementsCol, (snap) => {
      const map: Record<string, number> = {};
      snap.forEach((docSnap) => {
        map[docSnap.id] = asNum(
          (docSnap.data() as Record<string, unknown>).unlockedAt,
        );
      });
      setAchievementsUnlocked(map);
    });

    return () => {
      unsubUser();
      unsubProgress();
      unsubSkills();
      unsubActivity();
      unsubAchievements();
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

  // Accrue counters into today's activity doc (one doc per local day). Each field
  // is an `increment`, so concurrent bumps compose correctly.
  const bumpActivity = useCallback(
    async (
      patch: Partial<
        Pick<
          DailyActivity,
          "xp" | "lessonsCompleted" | "problemsSolved" | "reviewsDone"
        >
      >,
    ) => {
      if (!uid) return;
      const t = today();
      await setDoc(
        doc(db, "users", uid, "activity", t),
        {
          date: t,
          ...Object.fromEntries(
            Object.entries(patch).map(([k, v]) => [k, increment(v as number)]),
          ),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [uid],
  );

  // The single skill-mastery accrual point: read the latest persisted state,
  // apply the FSRS + mastery transition, and write it back. Reading fresh (not
  // from the snapshot) keeps consecutive accruals from racing on stale state.
  const accrueSkill = useCallback(
    async (skillId: SkillId, outcome: SkillOutcome) => {
      if (!uid) return;
      const ref = doc(db, "users", uid, "skillMastery", skillId);
      const snap = await getDoc(ref);
      const prev = snap.exists()
        ? deserializeSkill(snap.data() as Record<string, unknown>)
        : undefined;
      const next = applyOutcome(prev, outcome, Date.now());
      await setDoc(
        ref,
        { ...serializeSkill(next), updatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [uid],
  );

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
    async (
      id: LessonId,
      record: StepRecord & { stepId: string; skill?: SkillId },
    ) => {
      if (!uid) return;
      const { stepId, skill, ...rest } = record;
      const ref = doc(db, "users", uid, "progress", id);

      // Read the prior step record first: if a Koji reveal already marked this
      // step `assisted`, it already accrued the lapse — so the later "Continue"
      // recordStep must not double-count it.
      const prevSnap = await getDoc(ref);
      const prevSteps =
        ((prevSnap.data()?.steps as Record<string, StepRecord>) ?? {}) || {};
      const alreadyAccruedAssisted = prevSteps[stepId]?.assisted === true;

      await setDoc(
        ref,
        { steps: { [stepId]: rest }, updatedAt: serverTimestamp() },
        { merge: true },
      );

      // Phase 3 accrual: feed the outcome into the step's skill FSRS memory.
      if (!alreadyAccruedAssisted) {
        const resolved = skill ?? skillForLessonStep(id, stepId);
        if (resolved) {
          await accrueSkill(resolved, {
            correct: rest.correct,
            firstTryCorrect: rest.firstTryCorrect,
            assisted: rest.assisted,
          });
        }
      }
      await bumpActivity({ problemsSolved: 1 });
      await markActiveToday();
    },
    [uid, accrueSkill, bumpActivity, markActiveToday],
  );

  const recordReview = useCallback(
    async (skillId: SkillId, outcome: SkillOutcome) => {
      if (!uid) return;
      await accrueSkill(skillId, outcome);
      await bumpActivity({ reviewsDone: 1, xp: REVIEW_XP });
      await setDoc(
        doc(db, "users", uid),
        { totalXp: increment(REVIEW_XP) },
        { merge: true },
      );
      await markActiveToday();
    },
    [uid, accrueSkill, bumpActivity, markActiveToday],
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
      await bumpActivity({ xp: xpEarned, lessonsCompleted: 1 });
      await markActiveToday();
    },
    [uid, bumpActivity, markActiveToday],
  );

  const setDailyGoal = useCallback(
    async (xp: number) => {
      if (!uid) return;
      await setDoc(
        doc(db, "users", uid),
        { dailyGoalXp: xp, updatedAt: serverTimestamp() },
        { merge: true },
      );
    },
    [uid],
  );

  const resetProgress = useCallback(async () => {
    if (!uid) return;
    await Promise.all([
      ...lessonOrder.map((id) =>
        deleteDoc(doc(db, "users", uid, "progress", id)),
      ),
      ...skillOrder.map((id) =>
        deleteDoc(doc(db, "users", uid, "skillMastery", id)),
      ),
      // Also drop the pre-generated Infinite-Practice cache so a reset is a true
      // clean slate (it would otherwise self-invalidate via the difficulty key).
      clearPracticeCache(uid),
    ]);
  }, [uid]);

  const devMakeReviewsDue = useCallback(async () => {
    if (!uid) return;
    const now = Date.now();
    const back = now - 3 * 86_400_000; // ~3 days ago → a genuinely spaced gap
    await Promise.all(
      skillOrder.map(async (id) => {
        const ref = doc(db, "users", uid, "skillMastery", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const s = deserializeSkill(snap.data() as Record<string, unknown>);
        if (s.memory.lastReviewed === null) return; // never reviewed → nothing due
        await setDoc(
          ref,
          { lastReviewed: back, dueAt: back, updatedAt: serverTimestamp() },
          { merge: true },
        );
      }),
    );
  }, [uid]);

  const devCompleteAllLessons = useCallback(async () => {
    if (!uid) return;
    const now = Date.now();
    const firstTry: SkillOutcome = { correct: true, firstTryCorrect: true };

    // Complete only the TEACHING lessons (every lesson except the empty-stepped
    // Level Review). The Level Review is left undone so it stays locked behind
    // the all-skills-mastered gate — provisional skills aren't enough to unlock
    // it, which is exactly the realistic "just finished the lessons" state.
    const teachingLessons = lessonOrder.filter((id) => !isReviewLesson(id));
    const lessonWrites = teachingLessons.map((id) => {
      const lesson = getLesson(id);
      const steps: Record<string, StepRecord> = {};
      for (const step of lesson?.steps ?? []) {
        if (step.kind !== "problem") continue;
        steps[step.id] = {
          attempts: 0,
          correct: true,
          hintsUsed: false,
          firstTryCorrect: true,
        };
      }
      return setDoc(
        doc(db, "users", uid, "progress", id),
        {
          status: "completed",
          currentStepIndex: lesson?.steps.length ?? 0,
          steps,
          startedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });

    // Every skill → PROVISIONAL: a single first-try-correct demonstration earns
    // provisional, but NOT mastered (mastery requires surviving a later *due*
    // spaced review). The FSRS schedule is left natural — not back-dated — so the
    // separate "make reviews due now" button is what later forces reviews due.
    const skillWrites = skillOrder.map((id) => {
      const mastery = applyOutcome(newSkillMastery(now), firstTry, now);
      return setDoc(
        doc(db, "users", uid, "skillMastery", id),
        { ...serializeSkill(mastery), updatedAt: serverTimestamp() },
        { merge: true },
      );
    });

    // User doc → total XP across the TEACHING lessons + a sensible streak.
    const totalXp = teachingLessons.reduce((sum, id) => {
      const lesson = getLesson(id);
      return sum + (lesson ? lessonXp(lesson) : 0);
    }, 0);
    const userWrite = setDoc(
      doc(db, "users", uid),
      {
        totalXp,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    await Promise.all([...lessonWrites, ...skillWrites, userWrite]);
  }, [uid]);

  const devSimulateReview = useCallback(
    async ({ correct, wrong }: { correct: number; wrong: number }) => {
      if (!uid) return;
      const now = Date.now();

      // Determine the currently-due skills with the SAME definition the review
      // flow / reviews-card use (a skill is due once it's been reviewed and its
      // FSRS `dueAt` has been reached), most-urgent-first (lowest predicted
      // recall) like `dueReviews`. Read fresh from Firestore — the authoritative
      // source, exactly like the other dev tools — so the snapshot of "what's
      // due" is captured once, up front, before any outcome reschedules a skill.
      const dueWithR: { id: SkillId; r: number }[] = [];
      await Promise.all(
        skillOrder.map(async (id) => {
          const ref = doc(db, "users", uid, "skillMastery", id);
          const snap = await getDoc(ref);
          if (!snap.exists()) return;
          const s = deserializeSkill(snap.data() as Record<string, unknown>);
          if (s.memory.lastReviewed !== null && s.memory.dueAt <= now) {
            dueWithR.push({ id, r: currentRetrievability(s.memory, now) });
          }
        }),
      );
      if (dueWithR.length === 0) return; // nothing due → safe no-op
      dueWithR.sort((a, b) => a.r - b.r);
      const due = dueWithR.map((d) => d.id);

      // Clamp to non-negative integers (the modal already clamps, but the store
      // stays safe on its own).
      const passes = Math.max(0, Math.trunc(correct));
      const lapses = Math.max(0, Math.trunc(wrong));

      // Feed every simulated outcome through the EXACT real-review path
      // (`recordReview` → accrueSkill → applyOutcome), sequentially so each
      // skill's read-modify-write sees the prior write. Correct passes go FIRST,
      // round-robin across the due snapshot, so a due provisional skill can reach
      // `mastered` before any lapse reschedules it — a lapse never demotes a
      // mastered skill, but it pushes `dueAt` out, so the skill would no longer
      // read as "due" for a later pass.
      for (let i = 0; i < passes; i++) {
        await recordReview(due[i % due.length], {
          correct: true,
          firstTryCorrect: true,
        });
      }
      for (let i = 0; i < lapses; i++) {
        await recordReview(due[i % due.length], {
          correct: false,
          firstTryCorrect: false,
        });
      }
    },
    [uid, recordReview],
  );

  const devSimulateLevelReview = useCallback(
    async ({ correct, wrong }: { correct: number; wrong: number }) => {
      if (!uid) return;

      // Idempotent: if the Level Review is already completed, there's nothing to
      // do (running again must not re-award XP or re-apply outcomes).
      const progressRef = doc(
        db,
        "users",
        uid,
        "progress",
        LEVEL_REVIEW_LESSON_ID,
      );
      const progressSnap = await getDoc(progressRef);
      if (progressSnap.data()?.status === "completed") return;

      // The Level Review's skills, in quiz order, deduped so each gets even
      // round-robin treatment. Read each step's skill straight off the
      // ProblemStep — the same way the real level-review run does.
      const quiz = getQuiz(LEVEL_REVIEW_LESSON_ID) ?? [];
      const skills: SkillId[] = [];
      for (const step of quiz) {
        if (!skills.includes(step.skill)) skills.push(step.skill);
      }

      // Clamp to non-negative integers (the modal already clamps, but the store
      // stays safe on its own).
      const passes = Math.max(0, Math.trunc(correct));
      const lapses = Math.max(0, Math.trunc(wrong));

      // Apply the by-hand outcomes through the EXACT same path a real review uses
      // (`recordReview` → accrueSkill → applyOutcome), correct-first, round-robin
      // across the quiz's skills, sequentially so each skill's read-modify-write
      // sees the prior write.
      if (skills.length > 0) {
        for (let i = 0; i < passes; i++) {
          await recordReview(skills[i % skills.length], {
            correct: true,
            firstTryCorrect: true,
          });
        }
        for (let i = 0; i < lapses; i++) {
          await recordReview(skills[i % skills.length], {
            correct: false,
            firstTryCorrect: false,
          });
        }
      }

      // Mark the Level Review completed through the SAME store path the lesson
      // route calls on a passing quiz (`completeLesson`) — status + XP + activity
      // + streak, identical to a real completion. XP mirrors the real award:
      // QUIZ_QUESTION_XP per correct answer.
      await completeLesson(LEVEL_REVIEW_LESSON_ID, passes * QUIZ_QUESTION_XP);
    },
    [uid, recordReview, completeLesson],
  );

  // --- derived selectors (read current state) ---

  function skillMastery(id: SkillId): SkillMastery | null {
    return skills[id] ?? null;
  }

  function levelMastery(levelId: string): LevelMastery {
    const ids = skillsForLevel(levelId);
    let mastered = 0;
    let provisional = 0;
    let learning = 0;
    const detail = ids.map((id) => {
      const level = masteryLevelOf(skills[id]);
      if (level === "mastered") mastered += 1;
      else if (level === "provisional") provisional += 1;
      else if (level === "learning") learning += 1;
      return { id, level };
    });
    return {
      total: ids.length,
      mastered,
      provisional,
      learning,
      allMastered: ids.length > 0 && mastered === ids.length,
      skills: detail,
    };
  }

  function dueReviews(now: number): SkillId[] {
    const due: { id: SkillId; r: number }[] = [];
    for (const id of skillOrder) {
      const s = skills[id];
      if (s && s.memory.lastReviewed !== null && s.memory.dueAt <= now) {
        due.push({ id, r: currentRetrievability(s.memory, now) });
      }
    }
    due.sort((a, b) => a.r - b.r); // lowest predicted recall = most urgent
    return due.map((d) => d.id);
  }

  function nextReviewAt(now: number): number | null {
    let soonest: number | null = null;
    for (const id of skillOrder) {
      const s = skills[id];
      if (s && s.memory.lastReviewed !== null && s.memory.dueAt > now) {
        soonest = soonest === null ? s.memory.dueAt : Math.min(soonest, s.memory.dueAt);
      }
    }
    return soonest;
  }

  // --- Phase 3 Home selectors (daily activity, goal, achievements, league) ---

  function todayActivity(): DailyActivity {
    return activity[today()] ?? emptyActivity(today());
  }

  function weekActivity(): DailyActivity[] {
    return lastNDays(7).map((d) => activity[d] ?? emptyActivity(d));
  }

  function weeklyXp(): number {
    const start = weekStart();
    return Object.values(activity)
      .filter((a) => a.date >= start)
      .reduce((sum, a) => sum + a.xp, 0);
  }

  function activityFor(dates: string[]): DailyActivity[] {
    return dates.map((d) => activity[d] ?? emptyActivity(d));
  }

  function achievementFacts(): AchievementFacts {
    const completedLessons = lessonOrder.filter(
      (id) => lessonStatus(id) === "completed",
    );
    const hasPerfectLesson = completedLessons.some((id) => {
      const lesson = getLesson(id);
      const p = progress[id];
      const total = lesson ? problemCount(lesson) : 0;
      if (!p || total === 0) return false;
      const firstTry = Object.values(p.steps).filter(
        (s) => s.firstTryCorrect,
      ).length;
      return firstTry === total;
    });
    const m = levelMastery("level-1");
    const hadComeback = m.skills.some((s) => {
      const sm = skills[s.id];
      return sm?.masteryLevel === "mastered" && sm.lapses > 0;
    });
    const reviewsDone = Object.values(activity).reduce(
      (sum, a) => sum + a.reviewsDone,
      0,
    );
    return {
      currentStreak: profile?.currentStreak ?? 0,
      totalXp: profile?.totalXp ?? 0,
      hasCompletedLesson: completedLessons.length > 0,
      hasPerfectLesson,
      masteredCount: m.mastered,
      firstMastery: m.mastered >= 1,
      hadComeback,
      chapterComplete: lessonStatus("level-review") === "completed",
      reviewsDone,
    };
  }

  function unlockedAchievements(): Record<string, number> {
    return achievementsUnlocked;
  }

  // v1 reads at the stored tier (default 0); weekly promotion/demotion is a
  // future enhancement. The synthetic cohort reads correctly at any tier.
  function leagueState(now: number): LeagueState {
    const d = new Date(now);
    return buildLeague({
      seed: `${uid ?? "anon"}:${weekStart(d)}`,
      learnerName: profile?.displayName ?? "You",
      learnerWeeklyXp: weeklyXp(),
      tier: 0,
      dayOfWeek: (d.getDay() + 6) % 7,
      daysLeft: daysLeftInWeek(d),
    });
  }

  // Lock the level review (and any later level's lessons) until the gating
  // level's skills are all mastered. Teaching lessons in the current level stay
  // open (exploration within a level is preserved — SPOV 6).
  function isLessonLocked(id: LessonId): boolean {
    const level = levelForLesson(id);
    if (!level) return false;
    if (isReviewLesson(id)) {
      return !levelMastery(level.id).allMastered;
    }
    const idx = levelIndex(level.id);
    if (idx > 0) {
      const prior = course.levels[idx - 1];
      return !levelMastery(prior.id).allMastered;
    }
    return false;
  }

  function lessonStatus(id: LessonId): LessonStatus {
    const p = progress[id];
    if (p?.status === "completed") return "completed";
    if (isLessonLocked(id)) return "locked";
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

  /** The weakest not-yet-mastered skill (new/learning before provisional). */
  function weakestUnmasteredSkill(): SkillId | null {
    const rank: Record<MasteryLevel, number> = {
      new: 0,
      learning: 1,
      provisional: 2,
      mastered: 99,
    };
    let best: SkillId | null = null;
    let bestRank = 99;
    for (const id of skillOrder) {
      const level = masteryLevelOf(skills[id]);
      if (level === "mastered") continue;
      if (rank[level] < bestRank) {
        bestRank = rank[level];
        best = id;
      }
    }
    return best;
  }

  // Mastery-aware: resume → start the next open lesson → shore up a weak/locked
  // skill before advancing → fall back to a low-recall lesson → done.
  function recommendation(): Recommendation {
    for (const id of lessonOrder) {
      if (lessonStatus(id) === "in_progress")
        return { lessonId: id, kind: "continue" };
    }
    for (const id of lessonOrder) {
      if (lessonStatus(id) === "available") return { lessonId: id, kind: "start" };
    }
    // Everything reachable is done, but a skill may still block the gate.
    const weak = weakestUnmasteredSkill();
    if (weak) {
      return { lessonId: lessonForSkill(weak) ?? lessonOrder[0], kind: "review" };
    }
    for (const id of lessonOrder) {
      if (needsReview(id)) return { lessonId: id, kind: "review" };
    }
    return { lessonId: lessonOrder[lessonOrder.length - 1], kind: "done" };
  }

  // Persist any newly-satisfied achievement's unlock moment (idempotent: only
  // ids not already unlocked are written), enabling "NEW" badges + recency sort.
  useEffect(() => {
    if (!uid) return;
    const ready =
      profileLoaded && progressLoaded && skillsLoaded && activityLoaded;
    if (!ready) return;
    const due = unlockedIds(achievementFacts()).filter(
      (id) => !(id in achievementsUnlocked),
    );
    if (due.length === 0) return;
    void Promise.all(
      due.map((id) =>
        setDoc(
          doc(db, "users", uid, "achievements", id),
          { unlockedAt: Date.now() },
          { merge: true },
        ),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    uid,
    profileLoaded,
    progressLoaded,
    skillsLoaded,
    activityLoaded,
    profile,
    progress,
    skills,
    activity,
    achievementsUnlocked,
  ]);

  const value: LearnerContextValue = {
    loading: uid
      ? !profileLoaded || !progressLoaded || !skillsLoaded || !activityLoaded
      : false,
    // The map's "you are here" marker only needs progress (not the profile or
    // skill-mastery snapshots) to know the current lesson, so gate it on this
    // alone — a slow/failed secondary snapshot then can't leave it stuck.
    progressLoaded: uid ? progressLoaded : false,
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
    skillMastery,
    dueReviews,
    nextReviewAt,
    levelMastery,
    recordReview,
    todayActivity,
    weekActivity,
    weeklyXp,
    activityFor,
    setDailyGoal,
    achievementFacts,
    unlockedAchievements,
    leagueState,
    devMakeReviewsDue,
    devCompleteAllLessons,
    devSimulateReview,
    devSimulateLevelReview,
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
