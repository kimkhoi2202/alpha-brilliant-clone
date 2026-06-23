import type { ReactNode } from "react";

import {
  AuthCard,
  MenuDivider,
  MenuItem,
  MenuPanel,
  SignInForm,
  SignUpForm,
} from "../../components/auth";
import { Button, Modal } from "../../components/ui";
import { Section, Subhead } from "../Section";

function ReportProblemIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 17V0h9l.4 2H16v10H9l-.4-2H3v7H1Zm9.65-7H14V4H8.75l-.4-2H3v6h7.25l.4 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
        className="overflow-hidden rounded-[32px] border border-white/[0.04] bg-[#202020] shadow-[0_22px_60px_rgba(0,0,0,0.48)] sm:rounded-[36px]"
        size="md"
        trigger={<Button variant="outline">Open exit dialog</Button>}
      >
        {({ close }) => (
          <div className="relative flex w-full flex-col items-center gap-5 px-10 py-12 text-center md:gap-10 md:px-12 md:py-14">
            <button
              type="button"
              aria-label="Report problem"
              className="absolute right-3 top-2 inline-flex size-10 items-center justify-center rounded-md bg-transparent p-0 text-foreground transition-colors hover:bg-white/[0.07] active:bg-white/[0.1] focus-visible:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <ReportProblemIcon />
            </button>

            <div className="flex w-full flex-col items-center gap-4 md:gap-6">
              <h3 className="text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foreground md:text-[32px]">
                Are you sure?
              </h3>
              <p className="text-[20px] leading-normal tracking-[-0.01em] text-foreground/90 md:text-[24px]">
                If you quit, you will lose your progress and XP.
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <Button
                fullWidth
                className="mb-1 h-[64px] text-[22px] font-extrabold tracking-[-0.01em]"
                onPress={close}
              >
                Keep learning
              </Button>
              <button
                type="button"
                onClick={close}
                className="mb-1 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-[21px] font-extrabold tracking-[-0.01em] text-[#ff7d83] transition-colors hover:bg-[#3b0708] active:bg-[#47090a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
              >
                Quit
              </button>
            </div>
          </div>
        )}
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
