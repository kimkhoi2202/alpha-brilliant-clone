import {
  Button as HeroButton,
  type ButtonProps as HeroButtonProps,
} from "@heroui/react";
import { buttonVariants, tv } from "@heroui/styles";

import { cn } from "../../lib/cn";

type NativeVariant = NonNullable<HeroButtonProps["variant"]>;
type ExtraVariant = "success" | "warning";

/** Brilliant's full button set: HeroUI's variants plus success & warning. */
export type ButtonVariant = NativeVariant | ExtraVariant;

/**
 * Doc-canonical wrapper: extend HeroUI's `buttonVariants` (which emits the
 * `.button--*` classes) with the two intents HeroUI doesn't ship.
 *
 * success/warning map to our own `.button--success` / `.button--warning`
 * classes (defined unlayered in brilliant-theme.css). Those set the same
 * `--button-*` custom properties HeroUI's native variants use, so they recolor
 * the button through the theme seam — no utility override, no `!important`, and
 * robust against HeroUI's cascade-layer ordering.
 */
const appButton = tv({
  extend: buttonVariants,
  variants: {
    variant: {
      success: "button--success",
      warning: "button--warning",
    },
  },
});

const EXTRA_VARIANTS = new Set<ExtraVariant>(["success", "warning"]);
const isExtra = (v: ButtonVariant): v is ExtraVariant =>
  EXTRA_VARIANTS.has(v as ExtraVariant);

export interface ButtonProps
  extends Omit<HeroButtonProps, "variant" | "className"> {
  variant?: ButtonVariant;
  /**
   * Full-pill shape. Brilliant uses pills for marketing & nav CTAs; in-app
   * actions (Check / Continue / Start) keep the default ~12px rounded rectangle.
   */
  pill?: boolean;
  className?: string;
}

export function Button({
  variant = "primary",
  pill = false,
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
        // Default ~12px rounded rectangle (rounded-lg == --radius; overrides
        // HeroUI's pill base). Opt into a full pill for marketing / nav.
        className: cn(pill ? "rounded-full" : "rounded-lg", className),
      })}
    />
  );
}
