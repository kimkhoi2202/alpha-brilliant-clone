import type { ReactNode } from "react";

import { Button } from "../ui";

export interface ProviderButtonProps {
  icon?: ReactNode;
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

/** Social sign-in provider button (Google / Apple / Facebook). */
export function ProviderButton({
  icon,
  children,
  onPress,
  className,
}: ProviderButtonProps) {
  return (
    <Button
      variant="outline"
      fullWidth
      onPress={onPress}
      className={className}
    >
      {icon ? (
        <span className="mr-1 inline-grid size-5 place-items-center" aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </Button>
  );
}
