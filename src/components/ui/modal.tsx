import { Modal as HeroModal } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

type RootProps = ComponentProps<typeof HeroModal>;
type ContainerProps = ComponentProps<typeof HeroModal.Container>;

export interface ModalProps {
  /** Trigger element (uncontrolled open). */
  trigger?: ReactNode;
  children: ReactNode;
  isOpen?: RootProps["isOpen"];
  onOpenChange?: RootProps["onOpenChange"];
  size?: ContainerProps["size"];
  placement?: ContainerProps["placement"];
  /** Close on outside click / Esc (default true). */
  isDismissable?: boolean;
  className?: string;
}

/** Ergonomic wrapper over HeroUI v3's compound Modal. */
export function Modal({
  trigger,
  children,
  isOpen,
  onOpenChange,
  size,
  placement = "center",
  isDismissable = true,
  className,
}: ModalProps) {
  return (
    <HeroModal isOpen={isOpen} onOpenChange={onOpenChange}>
      {trigger ? <HeroModal.Trigger>{trigger}</HeroModal.Trigger> : null}
      <HeroModal.Backdrop isDismissable={isDismissable}>
        <HeroModal.Container size={size} placement={placement}>
          <HeroModal.Dialog className={className}>{children}</HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal>
  );
}

/** Button that dismisses the enclosing Modal. */
export function ModalClose(
  props: ComponentProps<typeof HeroModal.CloseTrigger>,
) {
  return <HeroModal.CloseTrigger {...props} />;
}
