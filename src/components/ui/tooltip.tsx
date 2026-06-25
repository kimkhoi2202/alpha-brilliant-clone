import { Tooltip as HeroTooltip } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

type RootProps = ComponentProps<typeof HeroTooltip>;
type ContentProps = ComponentProps<typeof HeroTooltip.Content>;

export interface TooltipProps {
  /** Tooltip body. */
  content: ReactNode;
  /** The trigger element (a focusable control). */
  children: ReactNode;
  /** Render the little arrow (default true). */
  showArrow?: boolean;
  placement?: ContentProps["placement"];
  delay?: RootProps["delay"];
  closeDelay?: RootProps["closeDelay"];
  className?: string;
}

/**
 * Ergonomic wrapper over HeroUI v3's compound Tooltip
 * (`Tooltip` + `Tooltip.Trigger` + `Tooltip.Content`).
 */
export function Tooltip({
  content,
  children,
  showArrow = true,
  placement,
  delay,
  closeDelay,
  className,
}: TooltipProps) {
  return (
    <HeroTooltip delay={delay} closeDelay={closeDelay}>
      <HeroTooltip.Trigger>{children}</HeroTooltip.Trigger>
      <HeroTooltip.Content
        showArrow={showArrow}
        placement={placement}
        className={className}
      >
        {content}
      </HeroTooltip.Content>
    </HeroTooltip>
  );
}
