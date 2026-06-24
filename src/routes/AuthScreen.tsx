import { useState, type FormEvent, type ReactNode } from "react";
import { Input } from "@heroui/react";
import { FirebaseError } from "firebase/app";

import { cn } from "../lib/cn";
import { useAuth } from "../lib/AuthContext";

type Mode = "social" | "email";

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-email":
        return "That email doesn't look right.";
      case "auth/missing-password":
        return "Enter your password.";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email or password is incorrect.";
      case "auth/email-already-in-use":
        return "That email is already registered. Try signing in.";
      case "auth/weak-password":
        return "Password should be at least 6 characters.";
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/operation-not-allowed":
        return "This sign-in method isn't enabled yet (Firebase console → Authentication).";
      case "auth/unauthorized-domain":
        return "This domain isn't authorized for sign-in (Firebase console → Authentication → Settings → Authorized domains).";
      case "auth/popup-blocked":
        return "Your browser blocked the sign-in popup. Allow popups and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  return "Something went wrong. Please try again.";
}

// --- Brilliant's social-provider marks (from their DOM) ---
function GoogleIcon() {
  return (
    <svg viewBox="0 0 20 21" fill="none" className="size-5" aria-hidden>
      <path
        d="M20.0002 10.511C20.0002 9.81688 19.9352 9.14949 19.8146 8.50879H10.2041V12.2951H15.6958C15.4593 13.5187 14.7404 14.5554 13.6596 15.2495V17.7055H16.9575C18.887 16.0014 20.0002 13.492 20.0002 10.511Z"
        fill="#4285F4"
      />
      <path
        d="M10.2048 20.0766C12.96 20.0766 15.2698 19.2001 16.9582 17.7051L13.6603 15.2491C12.7466 15.8364 11.5778 16.1834 10.2048 16.1834C7.54708 16.1834 5.29751 14.4616 4.49508 12.1479H1.08594V14.684C2.765 17.8831 6.21589 20.0766 10.2048 20.0766Z"
        fill="#34A853"
      />
      <path
        d="M4.49451 12.1483C4.29042 11.561 4.17446 10.9336 4.17446 10.2885C4.17446 9.64332 4.29042 9.01597 4.49451 8.42867V5.89258H1.08536C0.394255 7.21401 0 8.70897 0 10.2885C0 11.868 0.394255 13.3629 1.08536 14.6844L4.49451 12.1483Z"
        fill="#FBBC05"
      />
      <path
        d="M10.2048 4.39312C11.703 4.39312 13.0481 4.88699 14.1056 5.85694L17.0324 3.04944C15.2652 1.46994 12.9553 0.5 10.2048 0.5C6.21589 0.5 2.765 2.6935 1.08594 5.89253L4.49508 8.42862C5.29751 6.115 7.54708 4.39312 10.2048 4.39312Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" className="size-5" aria-hidden>
      <path
        d="M0 11.0662C0.00127985 16.5108 3.9361 21.1467 9.28038 22V14.2648H6.48977V11.0662H9.28368V8.6313C9.15878 7.47753 9.55044 6.32766 10.3524 5.49353C11.1544 4.6594 12.2837 4.22747 13.4338 4.31489C14.2594 4.32831 15.0829 4.40229 15.8977 4.53625V7.2578H14.5074C14.0287 7.19472 13.5475 7.35378 13.1993 7.69018C12.8511 8.02657 12.6735 8.5039 12.7167 8.98768V11.0662H15.7647L15.2774 14.2659H12.7167V22C18.4964 21.0809 22.5493 15.7697 21.9393 9.91413C21.3293 4.05853 16.2698 -0.291573 10.4263 0.0152787C4.58284 0.322131 0.000928892 5.17851 0 11.0662Z"
        fill="#0866FF"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 17 21" fill="none" className="size-5" aria-hidden>
      <path
        d="M11.0718 3.70342C11.691 2.95595 12.1288 1.93086 12.1288 0.905766C12.1288 0.756273 12.1181 0.617459 12.0861 0.5C11.0825 0.542712 9.87599 1.17272 9.14997 2.02696C8.5841 2.66765 8.05026 3.70342 8.05026 4.72851C8.05026 4.88868 8.08229 5.03817 8.09297 5.09156C8.15703 5.10224 8.2638 5.11292 8.35989 5.11292C9.26741 5.11292 10.3991 4.51495 11.0718 3.70342ZM11.7764 5.33716C10.271 5.33716 9.0432 6.25547 8.2638 6.25547C7.42033 6.25547 6.33131 5.39055 5.00739 5.39055C2.51971 5.39055 0 7.45142 0 11.3275C0 13.7515 0.928876 16.3142 2.08196 17.9586C3.0749 19.3468 3.93972 20.5 5.1889 20.5C6.4274 20.5 6.97191 19.6778 8.50936 19.6778C10.0682 19.6778 10.4098 20.4786 11.7764 20.4786C13.1324 20.4786 14.0399 19.24 14.8834 18.012C15.8443 16.6025 16.2393 15.2357 16.25 15.1716C16.1753 15.1503 13.5808 14.0932 13.5808 11.1247C13.5808 8.56193 15.6201 7.4087 15.7375 7.32328C14.3922 5.39055 12.3423 5.33716 11.7764 5.33716Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Brilliant's 3D pill button (face + bottom lip that compresses on press). */
function AuthButton({
  tone = "surface",
  icon,
  type = "button",
  disabled,
  onClick,
  children,
}: {
  tone?: "surface" | "inverse";
  icon?: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const inverse = tone === "inverse";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full rounded-full outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-60"
    >
      <span
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold transition-[transform,box-shadow,opacity] duration-100 ease-out group-hover:opacity-85 group-active:translate-y-1 group-active:shadow-none",
          inverse
            ? "bg-foreground text-background shadow-[0_4px_0_0_#c4c4cb]"
            : "border-2 border-border bg-surface text-foreground shadow-[0_4px_0_0_var(--border)]",
        )}
      >
        {icon ? (
          <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
        ) : null}
        {children}
      </span>
    </button>
  );
}

export function AuthScreen() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("social");
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const heading = mode === "email" && isSignup ? "Create your profile" : "Sign in";

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) {
        await signUpWithEmail(name.trim() || "Learner", email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  function unavailable(provider: string) {
    setError(`${provider} sign-in is coming soon. Use Google or email.`);
  }

  const canSubmit =
    email.trim() !== "" &&
    password !== "" &&
    (!isSignup || name.trim() !== "") &&
    !busy;

  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <img src="/favicon.svg" alt="" aria-hidden className="size-20" />
        <h2 className="w-full text-center text-3xl font-semibold tracking-tight">
          {heading}
        </h2>

        {mode === "social" ? (
          <div className="flex w-full flex-col gap-3">
            <AuthButton icon={<GoogleIcon />} disabled={busy} onClick={() => void handleGoogle()}>
              Sign in with Google
            </AuthButton>
            <AuthButton icon={<FacebookIcon />} onClick={() => unavailable("Facebook")}>
              Sign in with Facebook
            </AuthButton>
            <AuthButton icon={<AppleIcon />} onClick={() => unavailable("Apple")}>
              Continue with Apple
            </AuthButton>
            <AuthButton onClick={() => { setError(null); setMode("email"); }}>
              Sign in with email
            </AuthButton>
            {error ? (
              <p className="text-center text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <form className="flex w-full flex-col gap-3" onSubmit={(e) => void handleEmail(e)}>
            {isSignup ? (
              <Input
                fullWidth
                type="text"
                placeholder="Display name"
                autoComplete="name"
                aria-label="Display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            ) : null}
            <Input
              fullWidth
              type="email"
              placeholder="Email"
              autoComplete="email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              fullWidth
              type="password"
              placeholder="Password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? (
              <p className="text-center text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <AuthButton tone="inverse" type="submit" disabled={!canSubmit}>
              {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
            </AuthButton>
            <button
              type="button"
              onClick={() => { setError(null); setMode("social"); }}
              className="mx-auto text-sm font-medium text-muted underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              ← Back
            </button>
          </form>
        )}

        <div className="flex items-center gap-2 text-base">
          <span className="text-muted">{isSignup ? "Existing user?" : "New user?"}</span>
          <button
            type="button"
            className="font-bold text-foreground underline underline-offset-2 hover:opacity-80"
            onClick={() => {
              setError(null);
              setMode("email");
              setIsSignup((s) => !s);
            }}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
