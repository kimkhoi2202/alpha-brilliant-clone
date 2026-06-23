import {
  Button as HeroButton,
  type ButtonProps as HeroButtonProps,
} from "@heroui/react";
import { buttonVariants, tv } from "@heroui/styles";

import { cn } from "../../lib/cn";

type NativeVariant = NonNullable<HeroButtonProps["variant"]>;
type ExtraVariant = "success" | "warning";

/** Brilliant's full button set: HeroUI's six variants plus success & warning. */
export type ButtonVariant = NativeVariant | ExtraVariant;

/**
 * The doc-canonical wrapper: extend HeroUI's `buttonVariants` (which emits the
 * `.button--*` BEM classes) and add the two intents HeroUI doesn't ship.
 *
 * The success/warning fills are theme *utilities*, which live in a later
 * cascade layer than HeroUI's `.button--*` component styles, so they recolor
 * the base button cleanly — no `!important`.
 */
const appButton = tv({
  extend: buttonVariants,
  variants: {
    variant: {
      success: "bg-success text-success-foreground hover:bg-success-hover",
      warning: "bg-warning text-warning-foreground hover:bg-warning-hover",
    },
  },
});

const EXTRA_VARIANTS = new Set<ExtraVariant>(["success", "warning"]);
const isExtra = (v: ButtonVariant): v is ExtraVariant =>
  EXTRA_VARIANTS.has(v as ExtraVariant);

export interface ButtonProps
  extends Omit<HeroButtonProps, "variant" | "className"> {
  variant?: ButtonVariant;
  /** Pill shape (Brilliant style). Defaults to `true`. */
  pill?: boolean;
  className?: string;
}

export function Button({
  variant = "primary",
  pill = true,
  className,
  ...props
}: ButtonProps) {
  return (
    <HeroButton
      {...props}
      // Native variants render natively; the extra intents ride on the primary
      // structure and are recolored by appButton's theme utilities.
      variant={isExtra(variant) ? "primary" : variant}
      className={appButton({
        variant,
        size: props.size,
        className: cn(pill && "rounded-full", className),
      })}
    />
  );
}
