import {
  Button as HeroButton,
  type ButtonProps as HeroButtonProps,
} from "@heroui/react";
import { buttonVariants, tv } from "@heroui/styles";

import { cn } from "../../lib/cn";

type NativeVariant = NonNullable<HeroButtonProps["variant"]>;
type ExtraVariant = "accent" | "success" | "warning";

/** Brilliant's button set: HeroUI's variants plus accent / success / warning. */
export type ButtonVariant = NativeVariant | ExtraVariant;

/**
 * Doc-canonical wrapper: extend HeroUI's `buttonVariants` with the intents it
 * doesn't ship. Each maps to an unlayered `.button--*` class (brilliant-theme.css)
 * that drives HeroUI's own `--button-*` token seam — including `primary`, which
 * we redefine as Brilliant's high-contrast white CTA, and `accent` (the blue
 * "Start"). The 3D press-down lip also lives in those classes.
 */
const appButton = tv({
  extend: buttonVariants,
  variants: {
    variant: {
      accent: "button--accent",
      success: "button--success",
      warning: "button--warning",
    },
  },
});

const EXTRA_VARIANTS = new Set<ExtraVariant>(["accent", "success", "warning"]);
const isExtra = (v: ButtonVariant): v is ExtraVariant =>
  EXTRA_VARIANTS.has(v as ExtraVariant);

export interface ButtonProps
  extends Omit<HeroButtonProps, "variant" | "className"> {
  variant?: ButtonVariant;
  /**
   * Pill shape — Brilliant's default for buttons. Set `false` for square-ish
   * controls like icon buttons.
   */
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
      // Extra intents ride on the primary structure and are recolored by their
      // own `.button--*` class; native variants pass straight through.
      variant={isExtra(variant) ? "primary" : variant}
      className={appButton({
        variant,
        size: props.size,
        className: cn(pill ? "rounded-full" : "rounded-lg", className),
      })}
    />
  );
}
