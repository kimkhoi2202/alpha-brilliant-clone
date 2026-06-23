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
  className,
}: TileExpressionQuestionProps) {
  const slotIndices = blankSlotIndices(parts);

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
            >
              {value ?? "▢"}
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
            onPress={() => onBankPress?.(item.id)}
            className={item.used ? "opacity-40" : undefined}
          >
            {item.label}
          </AnswerChip>
        ))}
      </div>
    </div>
  );
}
