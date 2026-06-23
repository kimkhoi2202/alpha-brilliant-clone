import { cn } from "../../lib/cn";

export interface BarDatum {
  label: string;
  value: number;
}

export type BarState =
  | "default"
  | "selected"
  | "correct"
  | "incorrect"
  | "dimmed";

const BAR: Record<BarState, string> = {
  default: "bg-accent-soft hover:bg-accent/40",
  selected: "bg-accent",
  correct: "bg-success",
  incorrect: "bg-danger",
  dimmed: "bg-default",
};

export interface BarChartQuestionProps {
  data: BarDatum[];
  selectedIndex?: number | null;
  correctIndex?: number;
  /** When true, locks input and shows correct/incorrect coloring. */
  revealed?: boolean;
  onSelect?: (index: number) => void;
  maxValue?: number;
  ticks?: number;
  className?: string;
}

/** Tap-a-bar chart question (single-select expressed on a data viz). */
export function BarChartQuestion({
  data,
  selectedIndex = null,
  correctIndex,
  revealed = false,
  onSelect,
  maxValue,
  ticks = 5,
  className,
}: BarChartQuestionProps) {
  const max = maxValue ?? Math.max(...data.map((d) => d.value), 1);
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((max / ticks) * (ticks - i)),
  );

  function stateFor(i: number): BarState {
    if (revealed) {
      if (i === correctIndex) return "correct";
      if (i === selectedIndex) return "incorrect";
      return "dimmed";
    }
    return i === selectedIndex ? "selected" : "default";
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-3">
        <div className="flex h-56 w-8 flex-col justify-between text-right text-[10px] text-muted">
          {tickValues.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className="flex h-56 flex-1 items-end gap-3 border-b border-border">
          {data.map((d, i) => (
            <button
              key={d.label}
              type="button"
              onClick={() => onSelect?.(i)}
              disabled={revealed}
              aria-label={`${d.label}: ${d.value}`}
              aria-pressed={selectedIndex === i}
              className={cn(
                "flex-1 rounded-t-md transition-colors disabled:cursor-default",
                BAR[stateFor(i)],
              )}
              style={{ height: `${Math.max((d.value / max) * 100, 2)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-8 shrink-0" />
        <div className="flex flex-1 gap-3">
          {data.map((d) => (
            <span
              key={d.label}
              className="flex-1 pt-2 text-center text-xs text-muted"
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
