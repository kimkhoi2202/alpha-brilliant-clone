import { cn } from "../../lib/cn";

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible label (used as aria-label when no visible label is wired up). */
  label?: string;
  disabled?: boolean;
  className?: string;
}

/** Accessible on/off switch (role="switch"), styled to the Brilliant palette. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-default",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
