import { useState } from "react";
import type { ReactNode } from "react";

import { FooterCtaBar } from "../../components/chrome";
import { ConceptSlide } from "../../components/lesson";
import {
  MascotHeader,
  OnboardingChrome,
  SurveyPill,
} from "../../components/onboarding";
import { Button, OptionCard } from "../../components/ui";
import { Section, Subhead } from "../Section";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {children}
    </div>
  );
}

const goals = [
  "Exercise my brain",
  "Build math skills",
  "Get better at my job",
  "Help my child learn",
];

const minutes = [
  { id: "10", label: "10 min" },
  { id: "20", label: "20 min" },
  { id: "30", label: "30 min" },
  { id: "60", label: "60 min" },
];

export function Onboarding() {
  const [goal, setGoal] = useState<string | null>(null);
  const [mins, setMins] = useState("20");

  return (
    <Section
      id="onboarding"
      title="Onboarding"
      description="Mascot-led survey flow: chrome (progress + back), a reactive mascot header, single-select pills, and selectable card grids."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Subhead>Survey step (single-select)</Subhead>
          <Frame>
            <OnboardingChrome progress={40} onBack={() => {}} />
            <div className="space-y-6 px-5 py-8">
              <MascotHeader title="What brings you here?" />
              <div className="mx-auto max-w-sm space-y-3">
                {goals.map((g) => (
                  <SurveyPill
                    key={g}
                    selected={goal === g}
                    onPress={() => setGoal(g)}
                  >
                    {g}
                  </SurveyPill>
                ))}
              </div>
            </div>
            <FooterCtaBar>
              <Button fullWidth isDisabled={goal === null}>
                Continue
              </Button>
            </FooterCtaBar>
          </Frame>
        </div>

        <div>
          <Subhead>Daily goal (card grid)</Subhead>
          <Frame>
            <OnboardingChrome progress={70} onBack={() => {}} />
            <div className="space-y-6 px-5 py-8">
              <MascotHeader
                title="That's 365 lessons a year!"
                subtitle="Pick a daily goal that fits."
              />
              <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
                {minutes.map((m) => (
                  <OptionCard
                    key={m.id}
                    icon="⏱️"
                    label={m.label}
                    selected={mins === m.id}
                    onPress={() => setMins(m.id)}
                  />
                ))}
              </div>
            </div>
            <FooterCtaBar>
              <Button fullWidth>Continue</Button>
            </FooterCtaBar>
          </Frame>
        </div>
      </div>

      <Subhead className="mt-6">Value-prop slide</Subhead>
      <Frame>
        <OnboardingChrome progress={90} onBack={() => {}} />
        <div className="px-5 py-10">
          <ConceptSlide icon="🚀" title="Reach big learning goals">
            A few minutes a day adds up. We&apos;ll keep each session focused and
            fun.
          </ConceptSlide>
        </div>
        <FooterCtaBar>
          <Button fullWidth>Continue</Button>
        </FooterCtaBar>
      </Frame>
    </Section>
  );
}
