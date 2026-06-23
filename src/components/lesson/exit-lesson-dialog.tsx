import type { ReactNode } from "react";

import { Button, Modal } from "../ui";

export interface ExitLessonDialogProps {
  /** Controlled-open state (used in the lesson, opened by the top-bar X). */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (uncontrolled — e.g. in the showcase). */
  trigger?: ReactNode;
  /** Confirmed quit — leave the lesson (progress/XP for the run is lost). */
  onQuit: () => void;
}

/** Brilliant's "Are you sure?" confirmation, shown when exiting a lesson. */
export function ExitLessonDialog({
  isOpen,
  onOpenChange,
  trigger,
  onQuit,
}: ExitLessonDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="md"
      className="overflow-hidden rounded-[32px] border border-white/[0.04] bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)] sm:rounded-[36px]"
    >
      {({ close }) => (
        <div className="flex w-full flex-col items-center gap-8 px-8 py-12 text-center sm:px-10 md:gap-10 md:px-12">
          <div className="flex w-full flex-col items-center gap-4">
            <h2 className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground md:text-[32px]">
              Are you sure?
            </h2>
            <p className="text-lg leading-normal tracking-[-0.01em] text-foreground/90 md:text-xl">
              If you quit, you will lose your progress and XP.
            </p>
          </div>

          <div className="flex w-full max-w-[19rem] flex-col items-center gap-3.5">
            <Button
              fullWidth
              className="h-[60px] min-h-[60px] w-full text-xl font-extrabold tracking-[-0.01em]"
              onPress={close}
            >
              Keep learning
            </Button>
            {/* Same size as "Keep learning"; the red fill is a hover state, not
                a permanent background. */}
            <Button
              fullWidth
              variant="ghost"
              clicky={false}
              className="h-[60px] min-h-[60px] w-full text-lg font-extrabold tracking-[-0.01em] text-danger hover:bg-danger/15 data-[hover=true]:bg-danger/15 data-[pressed=true]:bg-danger/20"
              onPress={() => {
                close();
                onQuit();
              }}
            >
              Quit
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
