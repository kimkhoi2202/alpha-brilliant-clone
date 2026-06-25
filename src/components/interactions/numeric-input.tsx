import { cn } from "../../lib/cn";
import { StateBadge } from "../ui/state-badge";

export interface NumericInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Graded styling: green + ✓ when correct, gold + ✕ when wrong. */
  state?: "default" | "correct" | "incorrect";
  /** Fires on Enter (lets the player grade with the keyboard). */
  onEnter?: () => void;
}

/** Numeric answer entry: 18px+ to avoid iOS zoom; decimal keypad on mobile. */
export function NumericInput({
  value,
  onChange,
  unit,
  placeholder = "?",
  disabled,
  state = "default",
  onEnter,
}: NumericInputProps) {
  const graded = state !== "default";
  // Once graded (or disabled by the parent) the field is locked: it must be
  // fully inert — no typing, no Enter, no focus, and no mouse-wheel spinning —
  // while still showing the submitted value and its graded styling.
  const locked = graded || !!disabled;
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          readOnly={locked}
          tabIndex={locked ? -1 : undefined}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(event) => {
            if (locked) return;
            const raw = event.target.value.trim();
            if (raw === "") return onChange(null);
            const parsed = Number(raw);
            onChange(Number.isNaN(parsed) ? null : parsed);
          }}
          onKeyDown={(event) => {
            if (locked) return;
            // Ignore auto-repeat (held Enter) so a single press grades only once.
            if (event.key === "Enter" && !event.repeat) onEnter?.();
          }}
          onWheel={(event) => {
            // A focused number field can be spun by the mouse wheel; once locked,
            // drop focus so scrolling over the answer never changes its value.
            if (locked) event.currentTarget.blur();
          }}
          className={cn(
            "w-32 rounded-xl border bg-surface px-4 py-3.5 text-center text-3xl font-bold text-foreground outline-none transition-colors",
            // The "?" hint clears once the field is active so it doesn't sit
            // under the caret.
            "placeholder:text-muted focus:placeholder:text-transparent",
            // Graded states keep full opacity (a correct answer shouldn't look
            // dimmed) and swap the border/tint for the green ✓ / gold ✕ cue.
            state === "default" &&
              "border-border focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60",
            state === "correct" && "border-success bg-success/15",
            state === "incorrect" && "border-warning bg-warning/15",
          )}
          aria-label="Your answer"
        />
        {graded ? <StateBadge state={state} /> : null}
      </div>
      {unit ? <span className="text-xl text-muted">{unit}</span> : null}
    </div>
  );
}
