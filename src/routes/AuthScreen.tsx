import { useState, type FormEvent, type ReactNode } from "react";
import { Input } from "@heroui/react";

import { cn } from "../lib/cn";
import { friendlyAuthError as friendlyError } from "../lib/authErrors";
import { useAuth } from "../lib/AuthContext";

type Mode = "social" | "email";

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
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } =
    useAuth();
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

  // DEV-ONLY: guest sign-in via Firebase Anonymous auth so QA / headless
  // browsers can reach the lessons without a real account. Tree-shaken out of
  // production builds (the only call site is gated on `import.meta.env.DEV`).
  async function handleGuest() {
    setError(null);
    setBusy(true);
    try {
      await signInAsGuest();
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

  const canSubmit =
    email.trim() !== "" &&
    password !== "" &&
    (!isSignup || name.trim() !== "") &&
    !busy;

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <img src="/favicon.svg" alt="" aria-hidden className="size-20" />
        <h1 className="w-full text-center text-3xl font-semibold tracking-tight">
          {heading}
        </h1>

        {mode === "social" ? (
          <div className="flex w-full flex-col gap-3">
            <AuthButton icon={<GoogleIcon />} disabled={busy} onClick={() => void handleGoogle()}>
              Sign in with Google
            </AuthButton>
            <AuthButton onClick={() => { setError(null); setMode("email"); }}>
              Sign in with email
            </AuthButton>
            {import.meta.env.DEV ? (
              <AuthButton disabled={busy} onClick={() => void handleGuest()}>
                Continue as guest (dev)
              </AuthButton>
            ) : null}
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
                className="focus:border-accent focus:ring-0"
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
              className="focus:border-accent focus:ring-0"
            />
            <Input
              fullWidth
              type="password"
              placeholder="Password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:border-accent focus:ring-0"
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
    </main>
  );
}
