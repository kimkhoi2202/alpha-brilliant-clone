import { useState } from "react";

import { friendlyAuthError } from "../../lib/authErrors";
import { Button, Callout, Modal } from "../ui";
import { SettingField } from "./setting-field";

const CONFIRM_WORD = "DELETE";

export interface DeleteAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Show a current-password field (email/password accounts must reauthenticate). */
  requirePassword: boolean;
  /** Extra note about reauthentication (e.g. a Google popup will appear). */
  reauthNote?: string;
  /** Perform the deletion. Receives the typed password when required. */
  onConfirm: (password?: string) => Promise<void>;
}

/** Destructive confirmation: type DELETE (+ password) to permanently remove the account. */
export function DeleteAccountDialog({
  isOpen,
  onOpenChange,
  requirePassword,
  reauthNote,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset on close so stale input never lingers into the next open. (Doing this
  // here instead of in an effect avoids a synchronous setState-in-effect.)
  function handleOpenChange(open: boolean) {
    if (!open) {
      setConfirmText("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
    onOpenChange(open);
  }

  const canDelete =
    confirmText.trim().toUpperCase() === CONFIRM_WORD &&
    (!requirePassword || password !== "") &&
    !busy;

  async function handleDelete(close: () => void) {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(requirePassword ? password : undefined);
      close();
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      size="md"
      className="overflow-hidden rounded-3xl border border-border bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)]"
    >
      {({ close }) => (
        <div className="flex w-full flex-col gap-5 p-6 sm:p-8">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Delete your account
            </h2>
            <p className="text-sm text-muted">
              This permanently deletes your account, progress, streak, and XP.
              This action cannot be undone.
            </p>
          </div>

          <Callout intent="danger" title="There's no going back">
            All of your learning data will be erased immediately.
          </Callout>

          {requirePassword ? (
            <SettingField
              label="Current password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          ) : reauthNote ? (
            <p className="text-sm text-muted">{reauthNote}</p>
          ) : null}

          <SettingField
            label={`Type ${CONFIRM_WORD} to confirm`}
            placeholder={CONFIRM_WORD}
            autoComplete="off"
            spellCheck={false}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            error={error}
          />

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" clicky={false} onPress={close} isDisabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isDisabled={!canDelete}
              onPress={() => void handleDelete(close)}
            >
              {busy ? "Deleting…" : "Delete account"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
