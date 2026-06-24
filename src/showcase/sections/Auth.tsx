import type { ReactNode } from "react";

import {
  AuthCard,
  MenuDivider,
  MenuItem,
  MenuPanel,
  SignInForm,
  SignUpForm,
} from "../../components/auth";
import { ExitLessonDialog } from "../../components/lesson";
import { Button } from "../../components/ui";
import { Section, Subhead } from "../Section";

function Backdrop({ children }: { children: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-border bg-black/40 p-6">
      {children}
    </div>
  );
}

export function Auth() {
  return (
    <Section
      id="auth"
      title="Auth & overlays"
      description="Sign-in / sign-up cards, the Modal wrapper, and the account dropdown. Provider icons are placeholders."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Subhead>Sign in</Subhead>
          <Backdrop>
            <AuthCard title="Sign in" onClose={() => {}}>
              <SignInForm />
            </AuthCard>
          </Backdrop>
        </div>
        <div>
          <Subhead>Create profile</Subhead>
          <Backdrop>
            <AuthCard title="Create your profile" onClose={() => {}}>
              <SignUpForm />
            </AuthCard>
          </Backdrop>
        </div>
      </div>

      <Subhead className="mt-6">Exit-lesson dialog (live, click to open)</Subhead>
      <ExitLessonDialog
        trigger={<Button variant="outline">Open exit dialog</Button>}
        onQuit={() => {}}
      />

      <Subhead className="mt-6">Account menu</Subhead>
      <MenuPanel arrow="end">
        {/* arrow shown to mirror the live header dropdown */}
        <MenuItem>Settings</MenuItem>
        <MenuDivider />
        <MenuItem>About</MenuItem>
        <MenuItem>Help</MenuItem>
        <MenuItem>Product updates</MenuItem>
        <MenuDivider />
        <MenuItem danger>Log out</MenuItem>
      </MenuPanel>
    </Section>
  );
}
