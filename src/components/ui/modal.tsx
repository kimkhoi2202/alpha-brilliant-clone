import { Modal as HeroModal } from "@heroui/react";
import type { ComponentProps, ReactNode } from "react";

type RootProps = ComponentProps<typeof HeroModal>;
type ContainerProps = ComponentProps<typeof HeroModal.Container>;

export interface ModalProps {
  /** Trigger element (uncontrolled open). */
  trigger?: ReactNode;
  /**
   * Dialog content. Pass a render function to receive `close()` so action
   * buttons can dismiss the modal: this is the correct way to close from a
   * custom button (don't use `ModalClose`, which is the corner "X" affordance).
   */
  children: ReactNode | ((opts: { close: () => void }) => ReactNode);
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
      {/* z-[70] keeps the dialog + its backdrop above the Koji panel (z-[60])
          and the calculator (z-50), below toasts (z-[80]) — so a modal blurs out
          everything, including an open Koji chat. */}
      <HeroModal.Backdrop isDismissable={isDismissable} className="z-[70]">
        <HeroModal.Container size={size} placement={placement} className="z-[70]">
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
