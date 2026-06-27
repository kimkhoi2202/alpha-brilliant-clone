import type { RefObject } from "react";

import type {
  AnswerValue,
  Interaction,
  Step,
  VisualSpec,
} from "../../content/types";
import type { CanvasComponentHandle } from "../../lib/ai/tools/canvas";
import { cn } from "../../lib/cn";
import { renderMathText } from "../ui/math";
import {
  CoordinateGrid,
  RearrangementProof,
  RightTriangleFigure,
} from "../visuals";
import {
  CountSquaresFigure,
  NumericInput,
  PickAngleTriangle,
  PickSideTriangle,
  PlotPointsGrid,
  SliderInput,
} from "../interactions";
import { AnswerChoice, type AnswerChoiceState } from "./answer-choice";
import { BarChartQuestion } from "./bar-chart-question";
import { CategorizeQuestion } from "./categorize-question";
import { ConceptSlide } from "./concept-slide";
import { MultiSelectQuestion } from "./multi-select-question";
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
  /**
   * Sink for the mounted interaction's `CanvasComponentHandle` (Koji's canvas
   * tools). The host passes its interaction-handle ref here only when AI is on;
   * `InteractionView` forwards it to interactions that implement the handle
   * (currently `pick-side` / `pick-sides`). Omitted = no canvas wiring.
   */
  canvasRef?: RefObject<CanvasComponentHandle | null>;
}

function VisualView({ visual }: { visual: VisualSpec }) {
  switch (visual.kind) {
    case "right-triangle":
      return (
        <RightTriangleFigure
          a={visual.a}
          b={visual.b}
          showSquares={visual.showSquares}
          gridSquares={visual.gridSquares}
          highlightSquare={visual.highlightSquare}
          labels={visual.labels}
          unknownHypotenuse={visual.unknownHypotenuse}
          unknownSide={visual.unknownSide}
          showHypotenuseValue={visual.showHypotenuseValue}
          letterLabels={visual.letterLabels}
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
    case "rearrangement-proof":
      return <RearrangementProof a={visual.a} b={visual.b} />;
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
  canvasRef,
}: {
  interaction: Interaction;
  answer: AnswerValue | null;
  onAnswer: (a: AnswerValue) => void;
  phase: StepPhase;
  onSubmit?: () => void;
  stepVisual?: VisualSpec;
  canvasRef?: RefObject<CanvasComponentHandle | null>;
}) {
  const locked = phase !== "answering";

  switch (interaction.kind) {
    case "multiple-choice": {
      const chosen = answer?.kind === "multiple-choice" ? answer.choiceId : null;
      // Short labels (numbers, single words) → Brilliant's centered 2-col grid;
      // longer prose answers stay full-width and left-aligned.
      const compact = interaction.choices.every((c) => c.label.length <= 6);
      return (
        <div
          className={cn(
            "mx-auto w-full gap-3",
            compact ? "grid max-w-md grid-cols-2" : "flex max-w-md flex-col",
          )}
        >
          {interaction.choices.map((choice) => (
            <AnswerChoice
              key={choice.id}
              state={mcState(choice.id, chosen, interaction.correctChoiceId, phase)}
              align={compact ? "center" : "left"}
              disabled={locked}
              onPress={() =>
                onAnswer({ kind: "multiple-choice", choiceId: choice.id })
              }
            >
              {renderMathText(choice.label)}
            </AnswerChoice>
          ))}
        </div>
      );
    }
    case "multi-select": {
      const chosen = answer?.kind === "multi-select" ? answer.choiceIds : [];
      return (
        <MultiSelectQuestion
          choices={interaction.choices}
          selected={chosen}
          correctIds={interaction.correctChoiceIds}
          phase={phase}
          onToggle={(id) => {
            const next = chosen.includes(id)
              ? chosen.filter((c) => c !== id)
              : [...chosen, id];
            onAnswer({ kind: "multi-select", choiceIds: next });
          }}
        />
      );
    }
    case "categorize": {
      const placement =
        answer?.kind === "categorize"
          ? answer.placement
          : Object.fromEntries(interaction.items.map((it) => [it.id, null]));
      const correctBinByItem = Object.fromEntries(
        interaction.items.map((it) => [it.id, it.binId]),
      );
      return (
        <CategorizeQuestion
          bins={interaction.bins}
          items={interaction.items.map((it) => ({ id: it.id, label: it.label }))}
          placement={placement}
          correctBinByItem={correctBinByItem}
          phase={phase}
          onChange={(itemId, binId) =>
            onAnswer({
              kind: "categorize",
              placement: { ...placement, [itemId]: binId },
            })
          }
        />
      );
    }
    case "numeric": {
      const value = answer?.kind === "numeric" ? answer.value : null;
      // `revealed` fills in the correct value, so it reads as correct (green ✓),
      // mirroring how a revealed multiple-choice answer is shown.
      const numericState =
        phase === "correct" || phase === "revealed"
          ? "correct"
          : phase === "wrong"
            ? "incorrect"
            : "default";
      return (
        <NumericInput
          value={value}
          unit={interaction.unit}
          placeholder={interaction.placeholder}
          disabled={locked}
          state={numericState}
          canvasRef={canvasRef}
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
          canvasRef={canvasRef}
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
          targets={interaction.targets}
          disabled={locked}
          canvasRef={canvasRef}
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
    case "pick-side": {
      const side = answer?.kind === "pick-side" ? answer.side : null;
      return (
        <PickSideTriangle
          a={interaction.a}
          b={interaction.b}
          orientation={interaction.orientation}
          selected={side ? [side] : []}
          phase={phase}
          sideNames={interaction.sideNames}
          canvasRef={canvasRef}
          onSelect={(s) =>
            onAnswer({ kind: "pick-side", side: side === s ? null : s })
          }
        />
      );
    }
    case "pick-sides": {
      const sides = answer?.kind === "pick-sides" ? answer.sides : [];
      return (
        <PickSideTriangle
          a={interaction.a}
          b={interaction.b}
          orientation={interaction.orientation}
          selected={sides}
          correctSides={interaction.correctSides}
          phase={phase}
          sideNames={interaction.sideNames}
          emptyHint="Tap each leg to choose it."
          canvasRef={canvasRef}
          onSelect={(s) =>
            onAnswer({
              kind: "pick-sides",
              sides: sides.includes(s)
                ? sides.filter((x) => x !== s)
                : [...sides, s],
            })
          }
        />
      );
    }
    case "pick-angle": {
      const vertex = answer?.kind === "pick-angle" ? answer.vertex : null;
      return (
        <PickAngleTriangle
          a={interaction.a}
          b={interaction.b}
          selected={vertex}
          phase={phase}
          vertexNames={interaction.vertexNames}
          emptyHint="Tap the corner with the right angle."
          canvasRef={canvasRef}
          onSelect={(v) =>
            onAnswer({ kind: "pick-angle", vertex: vertex === v ? null : v })
          }
        />
      );
    }
    case "count-squares": {
      const value = answer?.kind === "count-squares" ? answer.value : null;
      const countState =
        phase === "correct" || phase === "revealed"
          ? "correct"
          : phase === "wrong"
            ? "incorrect"
            : "default";
      return (
        <CountSquaresFigure
          a={interaction.a}
          b={interaction.b}
          countSide={interaction.countSide}
          value={value}
          state={countState}
          disabled={locked}
          canvasRef={canvasRef}
          onChange={(v) => onAnswer({ kind: "count-squares", value: v })}
          onEnter={onSubmit}
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
export function StepView({
  step,
  answer,
  onAnswer,
  phase,
  onSubmit,
  canvasRef,
}: StepViewProps) {
  if (step.kind === "concept") {
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6">
        {step.visual ? <VisualView visual={step.visual} /> : null}
        <ConceptSlide
          title={step.title ? renderMathText(step.title) : undefined}
        >
          {renderMathText(step.body)}
        </ConceptSlide>
        {step.equation ? (
          <p className="text-center text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {renderMathText(step.equation)}
          </p>
        ) : null}
      </div>
    );
  }

  const showSeparateVisual =
    step.interaction.kind !== "plot-points" &&
    step.interaction.kind !== "pick-side" &&
    step.interaction.kind !== "pick-sides" &&
    step.interaction.kind !== "pick-angle" &&
    step.interaction.kind !== "count-squares" &&
    step.visual !== undefined;

  // Tile-expression steps stack the (tall) triangle figure above a token bank,
  // making them the tallest problem layout. Tighten their vertical rhythm so the
  // enlarged prompt still fits without scrolling on a short 1280×800 viewport;
  // the scroll container already supplies generous outer padding. Other steps
  // keep the roomier spacing (they have plenty of vertical headroom).
  const isTall = step.interaction.kind === "tile-expression";

  return (
    <div className={cn("flex flex-col px-4", isTall ? "gap-3" : "gap-4 py-4")}>
      <Prompt align="center" className="text-xl">
        {renderMathText(step.prompt)}
      </Prompt>
      {showSeparateVisual && step.visual ? (
        <div className={isTall ? undefined : "py-1"}>
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
        canvasRef={canvasRef}
      />
    </div>
  );
}
