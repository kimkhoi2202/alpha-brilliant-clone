import { Input } from "@heroui/react";
import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "../../lib/cn";

type InputProps = ComponentProps<typeof Input>;

export interface SettingFieldProps extends Omit<InputProps, "className"> {
  /** Visible label rendered above the input. */
  label: string;
  /** Optional helper text rendered below the input. */
  hint?: ReactNode;
  /** Error message; turns the field red and is announced to screen readers. */
  error?: string | null;
  inputClassName?: string;
  className?: string;
}

/** Labeled text input used throughout the settings forms. */
export function SettingField({
  label,
  hint,
  error,
  inputClassName,
  className,
  ...inputProps
}: SettingFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        fullWidth
        aria-label={label}
        aria-describedby={hint || error ? hintId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          "focus:border-accent focus:ring-0",
          error && "border-danger focus:border-danger",
          inputClassName,
        )}
        {...inputProps}
      />
      {error ? (
        <p id={hintId} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
