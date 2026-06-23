import { useState } from "react";
import type { ReactNode } from "react";

import { FooterCtaBar } from "../../components/chrome";
import {
  AnswerChoice,
  BarChartQuestion,
  ConceptSlide,
  FeedbackBar,
  Prompt,
  RegionShadeQuestion,
  TileExpressionQuestion,
} from "../../components/lesson";
import { Button } from "../../components/ui";
import { Section, Subhead } from "../Section";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {children}
    </div>
  );
}

const chartData = [
  { label: "CT", value: 120 },
  { label: "DE", value: 30 },
  { label: "NJ", value: 290 },
  { label: "NY", value: 640 },
  { label: "PA", value: 405 },
];
const CORRECT = 0; // "about 125 cafes" → CT (120)

function BarChartFlow() {
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [seeAnswer, setSeeAnswer] = useState(false);
  const isCorrect = sel === CORRECT;
  const reset = () => {
    setSel(null);
    setChecked(false);
    setSeeAnswer(false);
  };

  return (
    <Frame>
      <div className="space-y-6 px-4 py-6">
        <Prompt>What state has about 125 cafes?</Prompt>
        <BarChartQuestion
          data={chartData}
          selectedIndex={sel}
          correctIndex={CORRECT}
          revealed={checked}
          onSelect={setSel}
        />
      </div>
      {!checked ? (
        <FooterCtaBar>
          <Button fullWidth isDisabled={sel === null} onPress={() => setChecked(true)}>
            Check
          </Button>
        </FooterCtaBar>
      ) : seeAnswer ? (
        <FeedbackBar status="revealed" onFlag={() => {}}>
          <Button variant="secondary" size="sm">
            Why?
          </Button>
          <Button variant="outline" size="sm" onPress={reset}>
            Skip explanation
          </Button>
        </FeedbackBar>
      ) : isCorrect ? (
        <FeedbackBar status="correct" xp={15} onFlag={() => {}}>
          <Button variant="secondary" size="sm">
            Why?
          </Button>
          <Button variant="success" size="sm" onPress={reset}>
            Continue
          </Button>
        </FeedbackBar>
      ) : (
        <FeedbackBar status="retryable" onFlag={() => {}}>
          <Button variant="secondary" size="sm" onPress={() => setChecked(false)}>
            Try again
          </Button>
          <Button variant="outline" size="sm" onPress={() => setSeeAnswer(true)}>
            See answer
          </Button>
        </FeedbackBar>
      )}
    </Frame>
  );
}

function RegionShadeDemo() {
  const [shaded, setShaded] = useState<number[]>([]);
  const toggle = (i: number) =>
    setShaded((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  return (
    <Frame>
      <div className="space-y-5 px-4 py-6">
        <Prompt>Color ½ of the shape.</Prompt>
        <div className="flex justify-center">
          <RegionShadeQuestion rows={2} cols={2} shaded={shaded} onToggle={toggle} />
        </div>
      </div>
      <FooterCtaBar>
        <Button fullWidth isDisabled={shaded.length === 0}>
          Check
        </Button>
      </FooterCtaBar>
    </Frame>
  );
}

const bank = [
  { id: "a", label: "-4" },
  { id: "b", label: "-2" },
  { id: "c", label: "2" },
];

function TileExpressionDemo() {
  const [blanks, setBlanks] = useState<(string | null)[]>([null, null]);
  const place = (id: string) => {
    const item = bank.find((b) => b.id === id);
    if (!item || blanks.includes(item.label)) return;
    const next = blanks.findIndex((x) => x === null);
    if (next === -1) return;
    setBlanks(blanks.map((x, i) => (i === next ? item.label : x)));
  };
  const clear = (i: number) =>
    setBlanks(blanks.map((x, j) => (j === i ? null : x)));
  const bankItems = bank.map((b) => ({ ...b, used: blanks.includes(b.label) }));

  return (
    <Frame>
      <div className="space-y-5 px-4 py-6">
        <Prompt align="center">Factor the expression.</Prompt>
        <TileExpressionQuestion
          parts={["(x +", null, ")(x +", null, ")"]}
          blanks={blanks}
          bank={bankItems}
          onBankPress={place}
          onBlankPress={clear}
        />
      </div>
      <FooterCtaBar>
        <Button fullWidth isDisabled={blanks.some((b) => b === null)}>
          Check
        </Button>
      </FooterCtaBar>
    </Frame>
  );
}

export function Lesson() {
  return (
    <Section
      id="lesson"
      title="Lesson player"
      description="The graded-step shell (prompt + figure + Check → feedback bar) and the interaction types present in the screenshots. Built to extend to Brilliant's wider problem set."
    >
      <Subhead>Tap-a-bar question + grading flow (interactive)</Subhead>
      <BarChartFlow />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <Subhead>Tap-to-shade (interactive)</Subhead>
          <RegionShadeDemo />
        </div>
        <div>
          <Subhead>Fill-in-the-blank tiles (interactive)</Subhead>
          <TileExpressionDemo />
        </div>
      </div>

      <Subhead className="mt-6">Concept slide</Subhead>
      <Frame>
        <div className="px-4 py-10">
          <ConceptSlide icon="📐" title="Every fraction is a part of a whole">
            Splitting a shape into equal pieces lets us name each piece as a
            fraction of the whole.
          </ConceptSlide>
        </div>
      </Frame>

      <Subhead className="mt-6">Multiple choice (answer states)</Subhead>
      <div className="grid max-w-md gap-2">
        <AnswerChoice leading="A" state="default">
          Twelve
        </AnswerChoice>
        <AnswerChoice leading="B" state="selected">
          Fifteen
        </AnswerChoice>
        <AnswerChoice leading="C" state="correct">
          Eighteen
        </AnswerChoice>
        <AnswerChoice leading="D" state="incorrect">
          Twenty
        </AnswerChoice>
      </div>

      <Subhead className="mt-6">Feedback bar states</Subhead>
      <div className="space-y-3">
        <FeedbackBar status="correct" xp={15} onFlag={() => {}}>
          <Button variant="secondary" size="sm">
            Why?
          </Button>
          <Button variant="success" size="sm">
            Continue
          </Button>
        </FeedbackBar>
        <FeedbackBar status="retryable" onFlag={() => {}}>
          <Button variant="secondary" size="sm">
            Try again
          </Button>
          <Button variant="outline" size="sm">
            See answer
          </Button>
        </FeedbackBar>
        <FeedbackBar status="revealed" onFlag={() => {}}>
          <Button variant="secondary" size="sm">
            Why?
          </Button>
          <Button variant="outline" size="sm">
            Skip explanation
          </Button>
        </FeedbackBar>
      </div>
    </Section>
  );
}
