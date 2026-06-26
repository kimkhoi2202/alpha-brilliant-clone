import { cn } from "../../lib/cn";

export interface SliderInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
  /** Optional caption for the control (e.g. "Base"). */
  label?: string;
  /**
   * Slim single-row layout (label · track · value) for dense surfaces such as
   * the hero playground, instead of the default big centred readout.
   */
  compact?: boolean;
}

/** Slider with a big live readout: adjust and watch the value respond. */
export function SliderInput({
  min,
  max,
  step,
  value,
  onChange,
  unit,
  disabled,
  label,
  compact = false,
}: SliderInputProps) {
  const track = (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className={cn(
        "h-2 cursor-pointer appearance-none rounded-full bg-default disabled:opacity-60",
        compact ? "min-w-0 flex-1" : "w-full",
      )}
      style={{ accentColor: "var(--accent)" }}
      aria-label={label ?? "Adjust value"}
      aria-valuetext={`${value}${unit ? ` ${unit}` : ""}`}
    />
  );

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {label ? (
          <span className="w-12 shrink-0 text-sm font-medium text-muted">
            {label}
          </span>
        ) : null}
        {track}
        <span className="w-9 shrink-0 text-right text-base font-bold tabular-nums text-foreground">
          {value}
          {unit ? <span className="ml-0.5 text-muted">{unit}</span> : null}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
      {label ? (
        <span className="text-sm font-medium text-muted">{label}</span>
      ) : null}
      <div className="text-4xl font-extrabold tabular-nums text-foreground">
        {value}
        {unit ? <span className="ml-1 text-xl text-muted">{unit}</span> : null}
      </div>
      {track}
      <div className="flex w-full justify-between text-xs tabular-nums text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
