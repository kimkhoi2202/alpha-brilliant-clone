import type { ReactNode } from "react";

import {
  LessonComplete,
  StreakStarted,
  TrialUnlocked,
} from "../../components/celebration";
import { Section, Subhead } from "../Section";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {children}
    </div>
  );
}

export function Celebration() {
  return (
    <Section
      id="celebration"
      title="Celebration screens"
      description="Full-screen reward moments built on a shared CelebrationScreen shell. Illustrations are placeholders."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <Subhead>Lesson complete</Subhead>
          <Frame>
            <LessonComplete xp={180} onContinue={() => {}} />
          </Frame>
        </div>
        <div>
          <Subhead>Streak started</Subhead>
          <Frame>
            <StreakStarted count={1} onContinue={() => {}} />
          </Frame>
        </div>
        <div>
          <Subhead>Trial unlocked</Subhead>
          <Frame>
            <TrialUnlocked days={7} name="Sam" onContinue={() => {}} />
          </Frame>
        </div>
      </div>
    </Section>
  );
}
