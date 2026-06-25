import { useState } from "react";

import {
  EmailRow,
  SettingsLayout,
  SettingsSection,
} from "../../components/settings";
import { Button, Callout, OptionRow, Toast } from "../../components/ui";
import { Section, Subhead } from "../Section";

const navItems = [
  { id: "account", label: "Account" },
  { id: "premium", label: "Premium" },
  { id: "prefs", label: "Preferences" },
];

const reasons = [
  "Too expensive",
  "Not enough time",
  "Found another app",
  "Just taking a break",
];

export function Settings() {
  const [nav, setNav] = useState("account");
  const [reason, setReason] = useState<string | null>(null);

  return (
    <Section
      id="settings"
      title="Settings, callouts & toasts"
      description="Account settings shell with email rows + status badges, plus the callout and toast patterns used across the app."
    >
      <SettingsLayout
        nav={navItems.map((n) => ({
          ...n,
          active: nav === n.id,
          onPress: () => setNav(n.id),
        }))}
      >
        <SettingsSection title="Email address">
          <EmailRow
            email="alex@example.com"
            status="primary"
            actions={
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            }
          />
          <EmailRow
            email="alex.work@example.com"
            status="verified"
            actions={
              <Button size="sm" variant="ghost">
                Set as primary
              </Button>
            }
          />
          <EmailRow
            email="alex.alt@example.com"
            status="unverified"
            actions={
              <>
                <Button size="sm" variant="ghost">
                  Verify
                </Button>
                <Button size="sm" variant="ghost" className="text-danger">
                  Remove
                </Button>
              </>
            }
          />
        </SettingsSection>

        <SettingsSection title="Change password">
          <Callout intent="info" title="Heads up">
            Changing your password signs you out everywhere else.
          </Callout>
        </SettingsSection>

        <SettingsSection title="Why are you leaving?">
          <div className="space-y-2">
            {reasons.map((r) => (
              <OptionRow
                key={r}
                selected={reason === r}
                onPress={() => setReason(r)}
              >
                {r}
              </OptionRow>
            ))}
          </div>
        </SettingsSection>
      </SettingsLayout>

      <Subhead className="mt-8">Callouts</Subhead>
      <div className="grid gap-3 sm:grid-cols-2">
        <Callout intent="info" title="Info">
          An informational note with helpful context.
        </Callout>
        <Callout intent="warning" title="Warning">
          Cancel your Premium subscription before deactivating.
        </Callout>
        <Callout intent="danger" title="This cannot be undone">
          Your account and all data will be permanently deleted.
        </Callout>
        <Callout intent="neutral" title="Reminder">
          Worried about being charged by surprise?
        </Callout>
      </div>

      <Subhead className="mt-6">Toasts</Subhead>
      <div className="flex flex-wrap gap-3">
        <Toast intent="success" onClose={() => {}}>
          Personal information updated
        </Toast>
        <Toast intent="info" onClose={() => {}}>
          Your export is ready
        </Toast>
        <Toast intent="danger" onClose={() => {}}>
          Something went wrong
        </Toast>
      </div>
    </Section>
  );
}
