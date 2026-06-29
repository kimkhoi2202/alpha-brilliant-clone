import { useState } from "react";

import { Button, Callout, Modal } from "../ui";
import { SettingField } from "../settings";

export interface SimulateReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Changes each time the dialog is opened (and only then). Used to remount the
   * form so its inputs re-seed from the latest `dueCount` on every open — without
   * a setState-in-effect — while staying put during the close animation.
   */
  seedKey: number;
  /** Number of skills currently due — the default "Correct" value + the blurb. */
  dueCount: number;
  /** Apply the simulated outcomes (the store's `devSimulateReview`). */
  onConfirm: (counts: { correct: number; wrong: number }) => Promise<void>;
}

/** Parse a free-typed field into a non-negative integer (empty / junk → 0). */
function clampInt(raw: string): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * DEV-only dialog: fast-forward a spaced-review session. The learner types how
 * many review questions they "got right" and "wrong"; confirming applies those
 * outcomes to the currently-due skills through the exact same path a real review
 * uses (so FSRS memory + permanent-mastery behave identically), without clicking
 * through the review UI. Gated by the DEV TOOLS card in CourseMapScreen.
 */
export function SimulateReviewDialog({
  isOpen,
  onOpenChange,
  seedKey,
  dueCount,
  onConfirm,
}: SimulateReviewDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      className="overflow-hidden rounded-3xl border border-border bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)]"
    >
      {({ close }) => (
        // Remount per open (keyed by `seedKey`) so the lazy input defaults below
        // re-read the latest due count each time — no effect, no stale values.
        <SimulateReviewForm
          key={seedKey}
          dueCount={dueCount}
          onConfirm={onConfirm}
          onClose={close}
        />
      )}
    </Modal>
  );
}

interface SimulateReviewFormProps {
  dueCount: number;
  onConfirm: (counts: { correct: number; wrong: number }) => Promise<void>;
  onClose: () => void;
}

function SimulateReviewForm({
  dueCount,
  onConfirm,
  onClose,
}: SimulateReviewFormProps) {
  // Seeded once per open (the parent remounts this via `key`): Correct = current
  // due count (one clean pass per due skill → each provisional one reaches
  // mastered), Wrong = 0. Free-typed strings so a field can be cleared mid-edit;
  // clamped to non-negative integers on confirm.
  const [correct, setCorrect] = useState(() => String(dueCount));
  const [wrong, setWrong] = useState("0");
  const [busy, setBusy] = useState(false);

  const nothingDue = dueCount === 0;

  async function handleConfirm() {
    setBusy(true);
    await onConfirm({ correct: clampInt(correct), wrong: clampInt(wrong) });
    onClose();
  }

  return (
    <div className="flex w-full flex-col gap-5 p-6 sm:p-8">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Simulate a review
        </h2>
        <p className="text-sm text-muted">
          Applies review outcomes to your due skills through the same path a real
          review uses — FSRS scheduling and mastery update identically, no
          clicking through the review UI.
        </p>
      </div>

      {nothingDue ? (
        <Callout intent="info" title="Nothing is due">
          No skills are due for review right now. Use “Make reviews due now”
          first, then run this.
        </Callout>
      ) : (
        <p className="text-sm text-muted">
          <span className="font-semibold text-foreground">{dueCount}</span>{" "}
          review{dueCount === 1 ? "" : "s"} due right now. Outcomes are spread
          across the due skills (correct first), so a passing review can take a
          provisional skill to mastered.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <SettingField
          label="Correct (first try)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={correct}
          onChange={(e) => setCorrect(e.target.value)}
          disabled={nothingDue || busy}
        />
        <SettingField
          label="Wrong"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={wrong}
          onChange={(e) => setWrong(e.target.value)}
          disabled={nothingDue || busy}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          clicky={false}
          onPress={onClose}
          isDisabled={busy}
        >
          Cancel
        </Button>
        <Button
          variant="accent"
          isDisabled={nothingDue || busy}
          onPress={() => void handleConfirm()}
        >
          {busy ? "Applying…" : "Apply outcomes"}
        </Button>
      </div>
    </div>
  );
}
