import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { AppHeader } from "../components/chrome";
import {
  DeleteAccountDialog,
  SettingField,
  SettingRow,
  SettingsLayout,
  SettingsSection,
  Toggle,
} from "../components/settings";
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Modal,
  Toast,
  type ToastIntent,
} from "../components/ui";
import { lessonOrder } from "../content";
import { friendlyAuthError } from "../lib/authErrors";
import { useAuth } from "../lib/AuthContext";
import { cn } from "../lib/cn";
import { db } from "../lib/firebase";
import { useLearner } from "../lib/learner";
import { DEFAULT_DAILY_GOAL_XP } from "../lib/learning/activity";
import { useStreak } from "../hooks/useStreak";

type Notify = (intent: ToastIntent, message: string) => void;

type SectionId =
  | "profile"
  | "password"
  | "security"
  | "notifications"
  | "danger";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Password" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "danger", label: "Danger zone" },
];

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  );
}

/** Selectable daily XP targets (the goal picker, moved here from Home). */
const DAILY_GOAL_OPTIONS = [20, 30, 50] as const;

/**
 * Compact segmented picker for the daily XP goal. A plain bordered track with an
 * accent fill on the active option and no focus ring/glow — matching the app's
 * input convention.
 */
function DailyGoalPicker({
  value,
  onSelect,
  disabled,
}: {
  value: number;
  onSelect: (xp: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Daily goal in XP"
      className="inline-flex rounded-full border border-border bg-surface p-0.5"
    >
      {DAILY_GOAL_OPTIONS.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(opt)}
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- Profile */

function ProfilePanel({ notify }: { notify: Notify }) {
  const { user, updateDisplayName } = useAuth();
  const { profile, lessonStatus, setDailyGoal } = useLearner();
  const { currentStreak, longestStreak } = useStreak();

  const sourceName = profile?.displayName || user?.displayName || "";
  const email = profile?.email || user?.email || "";
  const xp = profile?.totalXp ?? 0;
  const completed = lessonOrder.filter(
    (id) => lessonStatus(id) === "completed",
  ).length;
  const goal = profile?.dailyGoalXp ?? DEFAULT_DAILY_GOAL_XP;

  async function handleSetGoal(nextGoal: number) {
    if (nextGoal === goal) return; // already the current target
    try {
      await setDailyGoal(nextGoal);
      notify("success", "Daily goal updated");
    } catch {
      notify("danger", "Couldn't update your daily goal. Try again.");
    }
  }

  // `draft === null` means "untouched": show the live profile name. Once the
  // user types we hold their edit. This avoids deriving state via an effect.
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? sourceName;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim() !== "" && name.trim() !== sourceName && !busy;

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      await updateDisplayName(name.trim());
      setDraft(null);
      notify("success", "Profile updated");
    } catch (err) {
      const message = friendlyAuthError(err);
      setError(message);
      notify("danger", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsSection title="Profile">
        <div className="flex items-center gap-4">
          <Avatar name={sourceName || email || "?"} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-foreground">
              {sourceName || "Learner"}
            </p>
            {email ? (
              <p className="truncate text-sm text-muted">{email}</p>
            ) : null}
          </div>
        </div>

        <SettingField
          label="Display name"
          placeholder="Your name"
          autoComplete="name"
          value={name}
          onChange={(e) => setDraft(e.target.value)}
          error={error}
          hint="This is how your name appears across AlphaBrilliant."
        />

        <div>
          <Button variant="accent" isDisabled={!canSave} onPress={() => void handleSave()}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Your learning">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Day streak" value={currentStreak} />
          <Stat label="Longest" value={longestStreak} />
          <Stat label="Total XP" value={xp} />
          <Stat label="Lessons" value={`${completed}/${lessonOrder.length}`} />
        </div>

        <SettingRow label="Daily goal" description="Your target XP per day.">
          <DailyGoalPicker
            value={goal}
            onSelect={(next) => void handleSetGoal(next)}
            disabled={!profile}
          />
        </SettingRow>
      </SettingsSection>
    </>
  );
}

/* ---------------------------------------------------------------- Password */

function PasswordPanel({ notify }: { notify: Notify }) {
  const { user, changePassword, sendPasswordReset } = useAuth();
  const ids = new Set((user?.providerData ?? []).map((p) => p.providerId));
  const hasPassword = ids.has("password");
  const isGuest = user?.isAnonymous ?? false;
  const email = user?.email ?? "";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPassword) {
    return (
      <SettingsSection title="Password">
        {isGuest ? (
          <Callout intent="neutral" title="You're browsing as a guest">
            Guest sessions don't have a password. Create an account to set one
            and keep your progress.
          </Callout>
        ) : (
          <Callout intent="info" title="Managed by Google">
            You sign in with Google, so there's no AlphaBrilliant password to
            change. Manage your password from your Google account.
          </Callout>
        )}
      </SettingsSection>
    );
  }

  const tooShort = next !== "" && next.length < 6;
  const mismatch = confirm !== "" && confirm !== next;
  const canSubmit =
    current !== "" && next.length >= 6 && confirm === next && !busy;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      notify("success", "Password updated");
    } catch (err) {
      const message = friendlyAuthError(err);
      setError(message);
      notify("danger", message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    try {
      await sendPasswordReset();
      notify("success", `Reset link sent to ${email}`);
    } catch (err) {
      notify("danger", friendlyAuthError(err));
    }
  }

  return (
    <SettingsSection title="Change password">
      <Callout intent="info" title="Heads up">
        Changing your password keeps you signed in here, but you may need to sign
        in again on your other devices.
      </Callout>

      <div className="max-w-md space-y-4">
        <SettingField
          label="Current password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <SettingField
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={tooShort ? "Use at least 6 characters." : undefined}
        />
        <SettingField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? "Passwords don't match." : (error ?? undefined)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="accent"
            isDisabled={!canSubmit}
            onPress={() => void handleSubmit()}
          >
            {busy ? "Updating…" : "Update password"}
          </Button>
          <button
            type="button"
            onClick={() => void handleReset()}
            className="text-sm font-medium text-link underline-offset-2 hover:underline"
          >
            Forgot your password?
          </button>
        </div>
      </div>
    </SettingsSection>
  );
}

/* ---------------------------------------------------------------- Security */

function SecurityPanel({ notify }: { notify: Notify }) {
  const navigate = useNavigate();
  const { user, logout, sendVerificationEmail } = useAuth();
  const ids = new Set((user?.providerData ?? []).map((p) => p.providerId));
  const hasPassword = ids.has("password");
  const hasGoogle = ids.has("google.com");
  const isGuest = user?.isAnonymous ?? false;
  const email = user?.email ?? "";
  const verified = user?.emailVerified ?? false;

  const [busyVerify, setBusyVerify] = useState(false);

  async function handleVerify() {
    setBusyVerify(true);
    try {
      await sendVerificationEmail();
      notify("success", `Verification email sent to ${email}`);
    } catch (err) {
      notify("danger", friendlyAuthError(err));
    } finally {
      setBusyVerify(false);
    }
  }

  return (
    <>
      <SettingsSection title="Sign-in methods">
        <div className="space-y-2">
          {hasGoogle ? (
            <SettingRow label="Google" description={email || "Connected"}>
              <Badge intent="accent">Connected</Badge>
            </SettingRow>
          ) : null}
          {hasPassword ? (
            <SettingRow label="Email & password" description={email}>
              <Badge intent="accent">Connected</Badge>
            </SettingRow>
          ) : null}
          {isGuest ? (
            <SettingRow
              label="Guest session"
              description="Sign up to secure your account"
            >
              <Badge intent="neutral">Temporary</Badge>
            </SettingRow>
          ) : null}
        </div>
      </SettingsSection>

      {email ? (
        <SettingsSection title="Email verification">
          <SettingRow
            label={email}
            description={
              verified
                ? "Your email address is verified."
                : "Verify your email to secure your account."
            }
          >
            {verified ? (
              <Badge intent="success">Verified</Badge>
            ) : (
              <Button
                size="sm"
                variant="outline"
                clicky={false}
                isDisabled={busyVerify}
                onPress={() => void handleVerify()}
              >
                {busyVerify ? "Sending…" : "Resend"}
              </Button>
            )}
          </SettingRow>
        </SettingsSection>
      ) : null}

      <SettingsSection title="Account details">
        <div className="space-y-2">
          <SettingRow label="Member since">
            <span className="text-sm text-muted">
              {formatDate(user?.metadata.creationTime)}
            </span>
          </SettingRow>
          <SettingRow label="Last sign-in">
            <span className="text-sm text-muted">
              {formatDate(user?.metadata.lastSignInTime)}
            </span>
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection title="Sessions">
        <SettingRow
          label="Sign out"
          description="Sign out of AlphaBrilliant on this device."
        >
          <Button
            size="sm"
            variant="outline"
            clicky={false}
            onPress={() => {
              void logout();
              void navigate({ to: "/auth" });
            }}
          >
            Sign out
          </Button>
        </SettingRow>
      </SettingsSection>
    </>
  );
}

/* ----------------------------------------------------------- Notifications */

interface Prefs {
  dailyReminder: boolean;
  streakReminder: boolean;
  productUpdates: boolean;
}

const DEFAULT_PREFS: Prefs = {
  dailyReminder: true,
  streakReminder: true,
  productUpdates: false,
};

const PREF_COPY: { key: keyof Prefs; label: string; description: string }[] = [
  {
    key: "dailyReminder",
    label: "Daily practice reminder",
    description: "A gentle nudge to keep your daily habit going.",
  },
  {
    key: "streakReminder",
    label: "Streak reminder",
    description: "Get reminded before your streak is about to break.",
  },
  {
    key: "productUpdates",
    label: "Product updates & tips",
    description: "Occasional news about new courses and features.",
  },
];

function NotificationsPanel({ notify }: { notify: Notify }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [fetched, setFetched] = useState(false);
  // Signed-out (no uid) → nothing to fetch, so treat as loaded.
  const loaded = uid === null ? true : fetched;

  useEffect(() => {
    if (!uid) return;
    let active = true;
    void getDoc(doc(db, "users", uid))
      .then((snap) => {
        if (!active) return;
        const stored = (snap.data()?.preferences ?? {}) as Partial<Prefs>;
        setPrefs({
          dailyReminder:
            typeof stored.dailyReminder === "boolean"
              ? stored.dailyReminder
              : DEFAULT_PREFS.dailyReminder,
          streakReminder:
            typeof stored.streakReminder === "boolean"
              ? stored.streakReminder
              : DEFAULT_PREFS.streakReminder,
          productUpdates:
            typeof stored.productUpdates === "boolean"
              ? stored.productUpdates
              : DEFAULT_PREFS.productUpdates,
        });
        setFetched(true);
      })
      .catch(() => {
        if (active) setFetched(true);
      });
    return () => {
      active = false;
    };
  }, [uid]);

  async function toggle(key: keyof Prefs) {
    const prev = prefs;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (!uid) return;
    try {
      await setDoc(
        doc(db, "users", uid),
        { preferences: updated },
        { merge: true },
      );
      notify("success", "Preferences saved");
    } catch {
      setPrefs(prev);
      notify("danger", "Couldn't save preferences. Try again.");
    }
  }

  return (
    <SettingsSection title="Notifications">
      <p className="text-sm text-muted">
        Choose what AlphaBrilliant can email you about.
      </p>
      <div className="space-y-2">
        {PREF_COPY.map((item) => (
          <SettingRow
            key={item.key}
            label={item.label}
            description={item.description}
          >
            <Toggle
              checked={prefs[item.key]}
              onChange={() => void toggle(item.key)}
              label={item.label}
              disabled={!loaded}
            />
          </SettingRow>
        ))}
      </div>
    </SettingsSection>
  );
}

/* ------------------------------------------------------------- Danger zone */

function DangerPanel({ notify }: { notify: Notify }) {
  const navigate = useNavigate();
  const { user, deleteAccount } = useAuth();
  const { resetProgress } = useLearner();
  const ids = new Set((user?.providerData ?? []).map((p) => p.providerId));
  const hasPassword = ids.has("password");
  const hasGoogle = ids.has("google.com");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resettingBusy, setResettingBusy] = useState(false);

  async function handleReset(close: () => void) {
    setResettingBusy(true);
    try {
      await resetProgress();
      close();
      notify("success", "Learning progress reset");
    } catch (err) {
      notify("danger", friendlyAuthError(err));
    } finally {
      setResettingBusy(false);
    }
  }

  async function handleDelete(password?: string) {
    // Best-effort wipe of the progress subcollection before the account goes.
    await resetProgress().catch(() => undefined);
    await deleteAccount(password);
    void navigate({ to: "/auth" });
  }

  return (
    <SettingsSection title="Danger zone">
      <div className="space-y-4 rounded-2xl border border-danger/40 bg-danger-soft/20 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              Reset learning progress
            </p>
            <p className="text-sm text-muted">
              Clears every lesson so you can start fresh. Your XP and streak stay.
            </p>
          </div>
          <Modal
            size="md"
            className="overflow-hidden rounded-3xl border border-border bg-overlay shadow-[0_22px_60px_rgba(0,0,0,0.48)]"
            trigger={
              <Button variant="warning" clicky={false} className="shrink-0">
                Reset progress
              </Button>
            }
          >
            {({ close }) => (
              <div className="flex w-full flex-col gap-5 p-6 sm:p-8">
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">
                    Reset all progress?
                  </h2>
                  <p className="text-sm text-muted">
                    Every lesson will be marked as not started. Your XP and
                    streak are kept. This can't be undone.
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    clicky={false}
                    onPress={close}
                    isDisabled={resettingBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="warning"
                    isDisabled={resettingBusy}
                    onPress={() => void handleReset(close)}
                  >
                    {resettingBusy ? "Resetting…" : "Reset progress"}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </div>

        <div className="h-px bg-border" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Delete account</p>
            <p className="text-sm text-muted">
              Permanently delete your account and all of your data.
            </p>
          </div>
          <Button
            variant="danger"
            clicky={false}
            className="shrink-0"
            onPress={() => setDeleteOpen(true)}
          >
            Delete account
          </Button>
        </div>
      </div>

      <DeleteAccountDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        requirePassword={hasPassword}
        reauthNote={
          hasGoogle && !hasPassword
            ? "You'll be asked to confirm with Google to continue."
            : undefined
        }
        onConfirm={handleDelete}
      />
    </SettingsSection>
  );
}

/* --------------------------------------------------------------- Screen */

function SectionContent({
  section,
  notify,
}: {
  section: SectionId;
  notify: Notify;
}): ReactNode {
  switch (section) {
    case "profile":
      return <ProfilePanel notify={notify} />;
    case "password":
      return <PasswordPanel notify={notify} />;
    case "security":
      return <SecurityPanel notify={notify} />;
    case "notifications":
      return <NotificationsPanel notify={notify} />;
    case "danger":
      return <DangerPanel notify={notify} />;
  }
}

export function SettingsScreen() {
  const [section, setSection] = useState<SectionId>("profile");
  const [toast, setToast] = useState<{
    intent: ToastIntent;
    message: string;
  } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const notify = useCallback<Notify>((intent, message) => {
    setToast({ intent, message });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  return (
    <div className="min-h-svh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted">
            Manage your profile, security, and preferences.
          </p>
        </div>

        <SettingsLayout
          nav={SECTIONS.map((s) => ({
            ...s,
            active: section === s.id,
            onPress: () => setSection(s.id),
          }))}
        >
          <SectionContent section={section} notify={notify} />
        </SettingsLayout>
      </main>

      {toast ? (
        <div className="fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
          <Toast intent={toast.intent} onClose={() => setToast(null)}>
            {toast.message}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}
