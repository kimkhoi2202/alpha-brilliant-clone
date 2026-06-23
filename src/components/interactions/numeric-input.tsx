import { cn } from "../../lib/cn";

export interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Fires on Enter (lets the player grade with the keyboard). */
  onEnter?: () => void;
}

/** Numeric answer entry — 18px+ to avoid iOS zoom; decimal keypad on mobile. */
export function NumericInput({
  value,
  onChange,
  unit,
  placeholder = "?",
  disabled,
  onEnter,
}: NumericInputProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => {
          const raw = event.target.value.trim();
          if (raw === "") return onChange(null);
          const parsed = Number(raw);
          onChange(Number.isNaN(parsed) ? null : parsed);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.();
        }}
        className={cn(
          "w-28 rounded-xl border border-border bg-surface px-4 py-3 text-center text-2xl font-bold text-foreground outline-none transition-colors",
          "focus:border-accent focus:ring-2 focus:ring-accent/30",
          "disabled:opacity-60",
        )}
        aria-label="Your answer"
      />
      {unit ? <span className="text-lg text-muted">{unit}</span> : null}
    </div>
  );
}
