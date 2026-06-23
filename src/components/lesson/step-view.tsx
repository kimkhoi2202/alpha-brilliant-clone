import type {
  AnswerValue,
  Interaction,
  Step,
  VisualSpec,
} from "../../content/types";
import { CoordinateGrid, RightTriangleFigure } from "../visuals";
import { NumericInput, PlotPointsGrid, SliderInput } from "../interactions";
import { AnswerChoice, type AnswerChoiceState } from "./answer-choice";
import { BarChartQuestion } from "./bar-chart-question";
import { ConceptSlide } from "./concept-slide";
import { Prompt } from "./prompt";
import {
  TileExpressionQuestion,
  type ExpressionBankItem,
} from "./tile-expression-question";

/** Grading lifecycle for a single step. */
export type StepPhase = "answering" | "correct" | "wrong" | "revealed";

export interface StepViewProps {
  step: Step;
  answer: AnswerValue | null;
  onAnswer: (answer: AnswerValue) => void;
  phase: StepPhase;
  /** Lets numeric entry grade on Enter. */
  onSubmit?: () => void;
}

function VisualView({ visual }: { visual: VisualSpec }) {
  switch (visual.kind) {
    case "right-triangle":
      return (
        <RightTriangleFigure
          a={visual.a}
          b={visual.b}
          showSquares={visual.showSquares}
          labels={visual.labels}
        />
      );
    case "coordinate-grid":
      return (
        <CoordinateGrid
          size={visual.size}
          markers={visual.markers}
          showDistance={visual.showDistance}
        />
      );
  }
}

function mcState(
  id: string,
  chosen: string | null,
  correctId: string,
  phase: StepPhase,
): AnswerChoiceState {
  if (phase === "answering") return chosen === id ? "selected" : "default";
  if (id === correctId && (phase === "correct" || phase === "revealed"))
    return "correct";
  if (id === chosen && phase === "wrong") return "incorrect";
  return "default";
}

function InteractionView({
  interaction,
  answer,
  onAnswer,
  phase,
  onSubmit,
  stepVisual,
}: {
  interaction: Interaction;
  answer: AnswerValue | null;
  onAnswer: (a: AnswerValue) => void;
  phase: StepPhase;
  onSubmit?: () => void;
  stepVisual?: VisualSpec;
}) {
  const locked = phase !== "answering";

  switch (interaction.kind) {
    case "multiple-choice": {
      const chosen = answer?.kind === "multiple-choice" ? answer.choiceId : null;
      return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          {interaction.choices.map((choice) => (
            <AnswerChoice
              key={choice.id}
              state={mcState(choice.id, chosen, interaction.correctChoiceId, phase)}
              disabled={locked}
              onPress={() =>
                onAnswer({ kind: "multiple-choice", choiceId: choice.id })
              }
            >
              {choice.label}
            </AnswerChoice>
          ))}
        </div>
      );
    }
    case "numeric": {
      const value = answer?.kind === "numeric" ? answer.value : null;
      return (
        <NumericInput
          value={value}
          unit={interaction.unit}
          placeholder={interaction.placeholder}
          disabled={locked}
          onChange={(v) => onAnswer({ kind: "numeric", value: v })}
          onEnter={onSubmit}
        />
      );
    }
    case "slider": {
      const value = answer?.kind === "slider" ? answer.value : interaction.min;
      return (
        <SliderInput
          min={interaction.min}
          max={interaction.max}
          step={interaction.step}
          value={value}
          unit={interaction.unit}
          disabled={locked}
          onChange={(v) => onAnswer({ kind: "slider", value: v })}
        />
      );
    }
    case "plot-points": {
      const placed = answer?.kind === "plot-points" ? answer.points : [];
      const markers =
        stepVisual?.kind === "coordinate-grid" ? stepVisual.markers : undefined;
      const target = interaction.targets.length;
      return (
        <PlotPointsGrid
          size={interaction.size}
          markers={markers}
          placed={placed}
          targetCount={target}
          disabled={locked}
          onPlace={(p) => {
            if (placed.some((q) => q.x === p.x && q.y === p.y)) return;
            const next = [...placed, p].slice(-target);
            onAnswer({ kind: "plot-points", points: next });
          }}
          onClear={() => onAnswer({ kind: "plot-points", points: [] })}
        />
      );
    }
    case "tap-bar": {
      const barId = answer?.kind === "tap-bar" ? answer.barId : null;
      const selectedIndex =
        barId === null ? null : interaction.bars.findIndex((b) => b.id === barId);
      const correctIndex = interaction.bars.findIndex(
        (b) => b.id === interaction.correctBarId,
      );
      return (
        <BarChartQuestion
          data={interaction.bars.map((b) => ({ label: b.label, value: b.value }))}
          selectedIndex={selectedIndex}
          correctIndex={correctIndex}
          revealed={locked}
          onSelect={(i) =>
            onAnswer({ kind: "tap-bar", barId: interaction.bars[i].id })
          }
        />
      );
    }
    case "tile-expression": {
      const filled =
        answer?.kind === "tile-expression"
          ? answer.filled
          : interaction.template.filter((t) => t === null).map(() => null);

      const place = (label: string, blankIndex: number) => {
        const next = filled.slice();
        for (let i = 0; i < next.length; i++) if (next[i] === label) next[i] = null;
        next[blankIndex] = label;
        onAnswer({ kind: "tile-expression", filled: next });
      };
      const placeFirstEmpty = (label: string) => {
        const idx = filled.findIndex((t) => t === null);
        if (idx >= 0) place(label, idx);
      };
      const clear = (blankIndex: number) => {
        const next = filled.slice();
        next[blankIndex] = null;
        onAnswer({ kind: "tile-expression", filled: next });
      };

      const bank: ExpressionBankItem[] = interaction.tiles.map((tile) => ({
        id: tile,
        label: tile,
        used: filled.includes(tile),
      }));

      return (
        <div className={locked ? "pointer-events-none opacity-90" : undefined}>
          <TileExpressionQuestion
            parts={interaction.template}
            blanks={filled}
            bank={bank}
            onBankPress={placeFirstEmpty}
            onBlankPress={clear}
            onDropToBlank={(id, blankIndex) => place(id, blankIndex)}
          />
        </div>
      );
    }
  }
}

/** Renders one lesson step (concept or problem) from the content model. */
export function StepView({ step, answer, onAnswer, phase, onSubmit }: StepViewProps) {
  if (step.kind === "concept") {
    return (
      <div className="flex flex-col items-center gap-6 px-4 py-10">
        {step.visual ? <VisualView visual={step.visual} /> : null}
        <ConceptSlide title={step.title}>{step.body}</ConceptSlide>
      </div>
    );
  }

  const showSeparateVisual =
    step.interaction.kind !== "plot-points" && step.visual !== undefined;

  return (
    <div className="flex flex-col gap-6 px-4 py-8">
      <Prompt align="center">{step.prompt}</Prompt>
      {showSeparateVisual && step.visual ? (
        <div className="py-1">
          <VisualView visual={step.visual} />
        </div>
      ) : null}
      <InteractionView
        interaction={step.interaction}
        answer={answer}
        onAnswer={onAnswer}
        phase={phase}
        onSubmit={onSubmit}
        stepVisual={step.visual}
      />
    </div>
  );
}
