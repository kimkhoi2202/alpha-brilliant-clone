import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { FooterCtaBar } from "../components/chrome";
import {
  PracticeError,
  PracticeLoading,
  PracticeProblem,
  PracticeShell,
  PracticeUnavailable,
  difficultyFromHistory,
  useInfinitePractice,
  type PracticeSessionStats,
} from "../components/practice";
import { Button } from "../components/ui";
import { aiEnabled } from "../lib/ai/flag";
import { useLearner, type StepRecord } from "../lib/learner";

const PRIMARY_CTA_CLASS = "h-12 min-h-12 text-base";
const SECONDARY_CTA_CLASS = "h-12 min-h-12 min-w-44 px-8 text-base";

/** Consecutive correct answers at the tail of the session (the live streak). */
function trailingStreak(records: StepRecord[]): number {
  let streak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (!records[i].correct) break;
    streak += 1;
  }
  return streak;
}

/**
 * "Infinite Practice" (PRD-phase-2 §2.4 / §4.2): a single dedicated mode,
 * reached after the course's `level-review`, that serves an endless stream of
 * verified, adaptive problems.
 */
export function InfinitePractice() {
  const navigate = useNavigate();
  const goToCourse = () => void navigate({ to: "/" });

  // AI-off (P1): the one surface that genuinely needs generation degrades to a
  // graceful explainer. We branch BEFORE the session so the generation loop
  // never runs with AI off — the rest of the app is unaffected.
  if (!aiEnabled()) return <PracticeUnavailable onBack={goToCourse} />;
  return <InfinitePracticeSession onExit={goToCourse} />;
}

function InfinitePracticeSession({ onExit }: { onExit: () => void }) {
  const { progress } = useLearner();
  // Session results feed back into difficulty so a hot/cold run nudges the ramp.
  const [sessionRecords, setSessionRecords] = useState<StepRecord[]>([]);

  const difficulty = useMemo(
    () => difficultyFromHistory(progress, sessionRecords),
    [progress, sessionRecords],
  );

  const { status, problem, token, next } = useInfinitePractice(difficulty);

  const stats: PracticeSessionStats = {
    solved: sessionRecords.filter((r) => r.correct).length,
    streak: trailingStreak(sessionRecords),
    difficulty,
  };

  const handleResult = (record: StepRecord) =>
    setSessionRecords((prev) => [...prev, record]);

  if (status === "ready" && problem) {
    return (
      <PracticeProblem
        key={token}
        step={problem}
        stats={stats}
        onExit={onExit}
        onResult={handleResult}
        onNext={next}
      />
    );
  }

  if (status === "error") {
    return (
      <PracticeShell
        stats={stats}
        onExit={onExit}
        footer={
          <FooterCtaBar sticky={false} constrain={false} divider={false}>
            <Button
              size="lg"
              variant="secondary"
              className={SECONDARY_CTA_CLASS}
              onPress={onExit}
            >
              Back to course
            </Button>
            <Button size="lg" className={SECONDARY_CTA_CLASS} onPress={next}>
              Try again
            </Button>
          </FooterCtaBar>
        }
      >
        <PracticeError />
      </PracticeShell>
    );
  }

  return (
    <PracticeShell
      stats={stats}
      onExit={onExit}
      footer={
        <FooterCtaBar sticky={false} divider={false}>
          <Button fullWidth size="lg" className={PRIMARY_CTA_CLASS} isDisabled>
            Check
          </Button>
        </FooterCtaBar>
      }
    >
      <PracticeLoading />
    </PracticeShell>
  );
}
