import { useState } from "react";
import type { DragEvent } from "react";

import { cn } from "../../lib/cn";
import { AnswerChip } from "./answer-chip";

export interface ExpressionBankItem {
  id: string;
  label: string;
  used?: boolean;
}

export interface TileExpressionQuestionProps {
  /** Expression tokens; `null` marks a blank slot (in order). */
  parts: (string | null)[];
  /** Value currently in each blank (by order); `null` = empty. */
  blanks: (string | null)[];
  bank: ExpressionBankItem[];
  onBlankPress?: (blankIndex: number) => void;
  onBankPress?: (id: string) => void;
  onDropToBlank?: (id: string, blankIndex: number) => void;
  className?: string;
}

/** Fill-in-the-blank expression with a tappable answer-chip bank. */
/** Maps each part index to its blank-slot index (or -1 for static tokens). */
function blankSlotIndices(parts: (string | null)[]): number[] {
  let count = 0;
  return parts.map((part) => (part === null ? count++ : -1));
}

export function TileExpressionQuestion({
  parts,
  blanks,
  bank,
  onBlankPress,
  onBankPress,
  onDropToBlank,
  className,
}: TileExpressionQuestionProps) {
  const slotIndices = blankSlotIndices(parts);
  const [dragOverBlank, setDragOverBlank] = useState<number | null>(null);

  const handleDragStart =
    (id: string) => (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
      event.dataTransfer.setData("application/x-alpha-brilliant-tile", id);
    };

  const handleDrop =
    (blankIndex: number) => (event: DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      setDragOverBlank(null);
      const id =
        event.dataTransfer.getData("application/x-alpha-brilliant-tile") ||
        event.dataTransfer.getData("text/plain");
      if (!id) return;
      onDropToBlank?.(id, blankIndex);
    };

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xl font-semibold text-foreground">
        {parts.map((part, i) => {
          if (part !== null) {
            return <span key={i}>{part}</span>;
          }
          const blankIndex = slotIndices[i];
          const value = blanks[blankIndex];
          return (
            <AnswerChip
              key={i}
              state={value ? "selected" : "blank"}
              onPress={() => onBlankPress?.(blankIndex)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverBlank(blankIndex);
              }}
              onDragLeave={() => setDragOverBlank(null)}
              onDrop={handleDrop(blankIndex)}
              aria-label={
                value
                  ? `Blank ${blankIndex + 1}, ${value}. Click to clear or drop another tile to replace.`
                  : `Blank ${blankIndex + 1}. Drop a tile here.`
              }
              className={cn(
                "min-h-11 min-w-16 transition-colors",
                dragOverBlank === blankIndex &&
                  "border-accent bg-accent-soft text-foreground",
              )}
            >
              {value ?? ""}
            </AnswerChip>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {bank.map((item) => (
          <AnswerChip
            key={item.id}
            state="default"
            disabled={item.used}
            draggable={!item.used}
            onDragStart={handleDragStart(item.id)}
            onPress={() => onBankPress?.(item.id)}
            aria-label={
              item.used
                ? `${item.label} already placed`
                : `Drag or click ${item.label}`
            }
            className={cn(
              "touch-none active:cursor-grabbing",
              item.used ? "opacity-40" : "cursor-grab",
            )}
          >
            {item.label}
          </AnswerChip>
        ))}
      </div>
    </div>
  );
}
