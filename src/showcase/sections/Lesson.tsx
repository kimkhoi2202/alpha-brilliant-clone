import { useState } from "react";
import type { ReactNode } from "react";

import { FooterCtaBar } from "../../components/chrome";
import {
  AnswerChoice,
  BarChartQuestion,
  ConceptSlide,
  FeedbackToast,
  LessonContainer,
  Prompt,
  RegionShadeQuestion,
  TileExpressionQuestion,
  type LessonEvaluation,
} from "../../components/lesson";
import { Button } from "../../components/ui";
import { Section, Subhead } from "../Section";

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
  const evaluation: LessonEvaluation = !checked
    ? "unsubmitted"
    : seeAnswer
      ? "revealed"
      : isCorrect
        ? "correct"
        : "retryable";
  const reset = () => {
    setSel(null);
    setChecked(false);
    setSeeAnswer(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <LessonContainer evaluation={evaluation}>
        <div className="space-y-6 px-5 py-6">
          <Prompt>What state has about 125 cafes?</Prompt>
          <BarChartQuestion
            data={chartData}
            selectedIndex={sel}
            correctIndex={CORRECT}
            revealed={checked}
            onSelect={setSel}
          />
        </div>
        {evaluation !== "unsubmitted" ? (
          <FeedbackToast status={evaluation} className="absolute bottom-4 left-4" />
        ) : null}
      </LessonContainer>

      {!checked ? (
        <FooterCtaBar sticky={false} divider={false}>
          <Button fullWidth isDisabled={sel === null} onPress={() => setChecked(true)}>
            Check
          </Button>
        </FooterCtaBar>
      ) : isCorrect ? (
        <FooterCtaBar sticky={false} divider={false} constrain={false}>
          <Button variant="secondary">Why?</Button>
          <Button variant="success" onPress={reset}>
            Continue
          </Button>
        </FooterCtaBar>
      ) : seeAnswer ? (
        <FooterCtaBar sticky={false} divider={false} constrain={false}>
          <Button variant="secondary">Why?</Button>
          <Button variant="outline" onPress={reset}>
            Skip explanation
          </Button>
        </FooterCtaBar>
      ) : (
        <FooterCtaBar sticky={false} divider={false} constrain={false}>
          <Button variant="secondary" onPress={() => setSeeAnswer(true)}>
            See answer
          </Button>
          <Button variant="warning" onPress={() => setChecked(false)}>
            Try again
          </Button>
        </FooterCtaBar>
      )}
    </div>
  );
}

function RegionShadeDemo() {
  const [shaded, setShaded] = useState<number[]>([]);
  const toggle = (i: number) =>
    setShaded((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  return (
    <div>
      <LessonContainer>
        <div className="space-y-5 px-5 py-6">
          <Prompt>Color ½ of the shape.</Prompt>
          <div className="flex justify-center">
            <RegionShadeQuestion rows={2} cols={2} shaded={shaded} onToggle={toggle} />
          </div>
        </div>
      </LessonContainer>
      <FooterCtaBar sticky={false} divider={false}>
        <Button fullWidth isDisabled={shaded.length === 0}>
          Check
        </Button>
      </FooterCtaBar>
    </div>
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
  const placeInBlank = (id: string, blankIndex: number) => {
    const item = bank.find((b) => b.id === id);
    if (!item) return;
    setBlanks((current) =>
      current.map((value, index) => {
        if (index === blankIndex) return item.label;
        // Prevent duplicate tiles if the same chip was already placed elsewhere.
        if (value === item.label) return null;
        return value;
      }),
    );
  };
  const clear = (i: number) =>
    setBlanks(blanks.map((x, j) => (j === i ? null : x)));
  const bankItems = bank.map((b) => ({ ...b, used: blanks.includes(b.label) }));

  return (
    <div>
      <LessonContainer>
        <div className="space-y-5 px-5 py-6">
          <Prompt align="center">Factor the expression.</Prompt>
          <TileExpressionQuestion
            parts={["(x +", null, ")(x +", null, ")"]}
            blanks={blanks}
            bank={bankItems}
            onBankPress={place}
            onBlankPress={clear}
            onDropToBlank={placeInBlank}
          />
        </div>
      </LessonContainer>
      <FooterCtaBar sticky={false} divider={false}>
        <Button fullWidth isDisabled={blanks.some((b) => b === null)}>
          Check
        </Button>
      </FooterCtaBar>
    </div>
  );
}

function FeedbackStateDemo({
  evaluation,
  children,
}: {
  evaluation: "correct" | "retryable" | "revealed";
  children: ReactNode;
}) {
  return (
    <div>
      <LessonContainer evaluation={evaluation}>
        <div className="grid h-24 place-items-center px-4 text-sm text-muted">
          graded answer
        </div>
        <FeedbackToast status={evaluation} className="absolute bottom-3 left-3" />
      </LessonContainer>
      <FooterCtaBar sticky={false} divider={false} constrain={false}>{children}</FooterCtaBar>
    </div>
  );
}

export function Lesson() {
  return (
    <Section
      id="lesson"
      title="Lesson player"
      description="The graded-step shell (prompt + figure + Check → container ring + feedback toast + colored footer) and the interaction types present in the screenshots. Built to extend to Brilliant's wider problem set."
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
      <LessonContainer>
        <div className="px-5 py-10">
          <ConceptSlide icon="📐" title="Every fraction is a part of a whole">
            Splitting a shape into equal pieces lets us name each piece as a
            fraction of the whole.
          </ConceptSlide>
        </div>
      </LessonContainer>

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

      <Subhead className="mt-6">
        Feedback states (container ring + toast + colored footer)
      </Subhead>
      <div className="grid gap-6 lg:grid-cols-3">
        <FeedbackStateDemo evaluation="correct">
          <Button variant="secondary" size="sm">
            Why?
          </Button>
          <Button variant="success" size="sm">
            Continue
          </Button>
        </FeedbackStateDemo>
        <FeedbackStateDemo evaluation="retryable">
          <Button variant="secondary" size="sm">
            See answer
          </Button>
          <Button variant="warning" size="sm">
            Try again
          </Button>
        </FeedbackStateDemo>
        <FeedbackStateDemo evaluation="revealed">
          <Button variant="secondary" size="sm">
            Why?
          </Button>
          <Button variant="outline" size="sm">
            Skip
          </Button>
        </FeedbackStateDemo>
      </div>
    </Section>
  );
}
