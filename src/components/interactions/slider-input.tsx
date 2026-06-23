export interface SliderInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  disabled?: boolean;
}

/** Slider with a big live readout — adjust and watch the value respond. */
export function SliderInput({
  min,
  max,
  step,
  value,
  onChange,
  unit,
  disabled,
}: SliderInputProps) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
      <div className="text-4xl font-extrabold tabular-nums text-foreground">
        {value}
        {unit ? <span className="ml-1 text-xl text-muted">{unit}</span> : null}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-default disabled:opacity-60"
        style={{ accentColor: "var(--accent)" }}
        aria-label="Adjust value"
        aria-valuetext={`${value}${unit ? ` ${unit}` : ""}`}
      />
      <div className="flex w-full justify-between text-xs tabular-nums text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
