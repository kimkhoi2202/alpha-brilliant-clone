import { Input } from "@heroui/react";

import { Button } from "../ui";
import { DividerOr } from "./divider-or";
import { ProviderButton } from "./provider-button";

export interface SignInFormProps {
  onSubmit?: () => void;
  onReset?: () => void;
  onSignUp?: () => void;
}

/** Email + social sign-in form body (place inside an AuthCard). */
export function SignInForm({ onSubmit, onReset, onSignUp }: SignInFormProps) {
  return (
    <>
      <ProviderButton icon="G">Continue with Google</ProviderButton>
      <DividerOr />
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
      <Button fullWidth onPress={onSubmit}>
        Sign in
      </Button>
      <div className="flex items-center justify-between pt-1 text-sm">
        <button
          type="button"
          onClick={onReset}
          className="text-link underline-offset-2 hover:underline"
        >
          Reset password
        </button>
        <span className="text-muted">
          New user?{" "}
          <button
            type="button"
            onClick={onSignUp}
            className="text-link underline-offset-2 hover:underline"
          >
            Sign up
          </button>
        </span>
      </div>
    </>
  );
}
