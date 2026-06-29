import { useState } from "react";

import { Button, Callout, Modal } from "../ui";
import { SettingField } from "../settings";

export interface SimulateLevelReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Changes each time the dialog is opened (and only then). Used to remount the
   * form so its inputs re-seed from `questionCount` on every open — without a
   * setState-in-effect — while staying put during the close animation.
   */
  seedKey: number;
  /** Number of Level Review questions — the default "Correct" value + the blurb. */
  questionCount: number;
  /** Whether the Level Review is already completed (then the action is a no-op). */
  alreadyCompleted: boolean;
  /** Apply the simulated completion (the store's `devSimulateLevelReview`). */
  onConfirm: (counts: { correct: number; wrong: number }) => Promise<void>;
}

/** Parse a free-typed field into a non-negative integer (empty / junk → 0). */
function clampInt(raw: string): number {
  const n = Math.trunc(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * DEV-only dialog: fast-forward the end-of-level Level Review. The learner types
 * how many of its questions they "got right" and "wrong"; confirming applies
 * those outcomes to the Level Review's skills (the same path a real review uses)
 * and marks the lesson completed — without clicking through the quiz. Gated by
 * the DEV TOOLS card in CourseMapScreen.
 */
export function SimulateLevelReviewDialog({
  isOpen,
  onOpenChange,
  seedKey,
  questionCount,
  alreadyCompleted,
  onConfirm,
}: SimulateLevelReviewDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      size="md"
      className="overflow-hidden rounded-3xl border border-border bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)]"
    >
      {({ close }) => (
        // Remount per open (keyed by `seedKey`) so the lazy input defaults below
        // re-read the question count each time — no effect, no stale values.
        <SimulateLevelReviewForm
          key={seedKey}
          questionCount={questionCount}
          alreadyCompleted={alreadyCompleted}
          onConfirm={onConfirm}
          onClose={close}
        />
      )}
    </Modal>
  );
}

interface SimulateLevelReviewFormProps {
  questionCount: number;
  alreadyCompleted: boolean;
  onConfirm: (counts: { correct: number; wrong: number }) => Promise<void>;
  onClose: () => void;
}

function SimulateLevelReviewForm({
  questionCount,
  alreadyCompleted,
  onConfirm,
  onClose,
}: SimulateLevelReviewFormProps) {
  // Seeded once per open (the parent remounts this via `key`): Correct = the
  // number of Level Review questions (so the score clears the pass bar), Wrong =
  // 0. Free-typed strings so a field can be cleared mid-edit; clamped to
  // non-negative integers on confirm.
  const [correct, setCorrect] = useState(() => String(questionCount));
  const [wrong, setWrong] = useState("0");
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    await onConfirm({ correct: clampInt(correct), wrong: clampInt(wrong) });
    onClose();
  }

  return (
    <div className="flex w-full flex-col gap-5 p-6 sm:p-8">
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Simulate Level Review
        </h2>
        <p className="text-sm text-muted">
          Marks the end-of-level review complete as if you answered every
          question by hand — the same effects a real completion has, plus your
          by-hand correct/wrong outcomes applied to its skills.
        </p>
      </div>

      {alreadyCompleted ? (
        <Callout intent="info" title="Already completed">
          The Level Review is already marked complete, so this won't change
          anything.
        </Callout>
      ) : (
        <p className="text-sm text-muted">
          The Level Review has{" "}
          <span className="font-semibold text-foreground">{questionCount}</span>{" "}
          question{questionCount === 1 ? "" : "s"}. Outcomes are spread across its
          skills (correct first), then the lesson is marked completed.
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
          disabled={alreadyCompleted || busy}
        />
        <SettingField
          label="Wrong"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={wrong}
          onChange={(e) => setWrong(e.target.value)}
          disabled={alreadyCompleted || busy}
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
          isDisabled={alreadyCompleted || busy}
          onPress={() => void handleConfirm()}
        >
          {busy ? "Completing…" : "Complete Level Review"}
        </Button>
      </div>
    </div>
  );
}
