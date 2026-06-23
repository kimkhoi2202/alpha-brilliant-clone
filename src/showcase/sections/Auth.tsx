import type { ReactNode } from "react";

import {
  AuthCard,
  MenuDivider,
  MenuItem,
  MenuPanel,
  SignInForm,
  SignUpForm,
} from "../../components/auth";
import { Button, Modal, ModalClose } from "../../components/ui";
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

      <Subhead className="mt-6">Modal (live — click to open)</Subhead>
      <Modal
        size="sm"
        trigger={<Button variant="outline">Open exit dialog</Button>}
      >
        <div className="space-y-4 p-6 text-center">
          <h3 className="text-lg font-bold text-foreground">Exit lesson?</h3>
          <p className="text-sm text-muted">
            Your progress on this problem won&apos;t be saved.
          </p>
          <div className="flex justify-center gap-2">
            <ModalClose className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium text-foreground">
              Cancel
            </ModalClose>
            <ModalClose className="inline-flex h-10 items-center rounded-lg bg-danger px-4 text-sm font-medium text-danger-foreground">
              Exit lesson
            </ModalClose>
          </div>
        </div>
      </Modal>

      <Subhead className="mt-6">Account menu</Subhead>
      <MenuPanel>
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
