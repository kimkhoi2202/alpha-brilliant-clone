import { Input } from "@heroui/react";

import { Button } from "../ui";
import { DividerOr } from "./divider-or";
import { ProviderButton } from "./provider-button";

export interface SignUpFormProps {
  onSubmit?: () => void;
  onSignIn?: () => void;
}

/** Create-profile form body (place inside an AuthCard). */
export function SignUpForm({ onSubmit, onSignIn }: SignUpFormProps) {
  return (
    <>
      <ProviderButton icon="G">Continue with Google</ProviderButton>
      <DividerOr />
      <Input
        type="email"
        placeholder="Email"
        className="focus:border-accent focus:ring-0"
      />
      <Input
        type="password"
        placeholder="Password"
        className="focus:border-accent focus:ring-0"
      />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="First name" className="focus:border-accent focus:ring-0" />
        <Input placeholder="Last name" className="focus:border-accent focus:ring-0" />
      </div>
      <Input
        type="number"
        placeholder="Age"
        className="focus:border-accent focus:ring-0"
      />
      <Button fullWidth onPress={onSubmit}>
        Create account
      </Button>
      <p className="pt-1 text-center text-xs text-muted">
        By signing up you agree to our Terms and Privacy Policy.
      </p>
      <p className="text-center text-sm text-muted">
        Existing user?{" "}
        <button
          type="button"
          onClick={onSignIn}
          className="text-link underline-offset-2 hover:underline"
        >
          Sign in
        </button>
      </p>
    </>
  );
}
