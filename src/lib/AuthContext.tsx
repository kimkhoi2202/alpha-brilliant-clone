import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
  /**
   * DEV-ONLY guest sign-in (Firebase Anonymous auth). Wired to a dev-gated
   * button on the auth screen; never surfaced in production builds. Anonymous
   * users get a real `uid` + ID token, so Firestore and the `/api` routes work.
   */
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  /** Update the signed-in user's display name (Auth profile + Firestore mirror). */
  updateDisplayName: (name: string) => Promise<void>;
  /**
   * Change the password for an email/password account. Reauthenticates with the
   * current password first (Firebase requires a recent login for this).
   */
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  /** Send a verification email to the signed-in user's address. */
  sendVerificationEmail: () => Promise<void>;
  /** Send a password-reset email to the given address (defaults to the user's). */
  sendPasswordReset: (email?: string) => Promise<void>;
  /**
   * Permanently delete the signed-in account. Reauthenticates first
   * (password credential or Google popup) since Firebase requires a recent
   * login, then removes the Firestore profile doc and the Auth user.
   */
  deleteAccount: (currentPassword?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Mirror the authenticated user into `users/{uid}` (PRD §4.2). We only ever
 * write the display name when we actually have one, so the empty-name write
 * that fires on `createUser` (before `updateProfile`) can't clobber it.
 */
async function upsertUserProfile(user: User): Promise<void> {
  const data: Record<string, unknown> = {
    uid: user.uid,
    email: user.email ?? "",
    photoURL: user.photoURL ?? "",
    updatedAt: serverTimestamp(),
  };
  if (user.displayName) data.displayName = user.displayName;
  await setDoc(doc(db, "users", user.uid), data, { merge: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // DEV-ONLY guest path. Tracks the single automatic anonymous sign-in so it
  // fires exactly once on a fresh load with no session, never re-fires on a
  // later sign-out (so /auth stays reachable in dev), and survives StrictMode's
  // double-invoked effect without flashing the /auth screen.
  const devGuest = useRef<"idle" | "pending" | "settled">("idle");

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      if (nextUser) {
        devGuest.current = "settled";
        setUser(nextUser);
        setLoading(false);
        void upsertUserProfile(nextUser).catch((error) =>
          console.error("Failed to sync user profile", error),
        );
        return;
      }

      setUser(null);

      // No authenticated user. In DEV only, sign in anonymously ONCE so QA /
      // headless browsers land straight in the app with a REAL Firebase session
      // (real uid + ID token → Firestore and the auth-guarded /api routes both
      // work). We never override an existing session: this branch only runs when
      // unauthenticated. Production is untouched — it falls through to the normal
      // /auth redirect below.
      if (import.meta.env.DEV) {
        if (devGuest.current === "idle") {
          devGuest.current = "pending";
          void signInAnonymously(auth).catch((error) => {
            devGuest.current = "settled";
            console.error("Dev guest sign-in failed", error);
            // Stop waiting so the normal /auth screen (with its dev guest
            // button) renders — Anonymous auth is likely not enabled for this
            // Firebase project (Console → Authentication → Anonymous → Enable).
            setLoading(false);
          });
          return; // keep the splash up while the sign-in resolves
        }
        if (devGuest.current === "pending") {
          return; // attempt still in flight (e.g. a StrictMode re-subscribe)
        }
      }

      setLoading(false);
    });
  }, []);

  async function signInWithGoogle(): Promise<void> {
    await signInWithPopup(auth, googleProvider);
  }

  async function signInWithEmail(
    email: string,
    password: string,
  ): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUpWithEmail(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await upsertUserProfile(cred.user);
    // Reflect the new display name locally without waiting for a reload.
    setUser(auth.currentUser);
  }

  // DEV-ONLY guest sign-in. Used by the dev-gated button on the auth screen and
  // mirrors the automatic path above; harmless in prod (nothing calls it there).
  async function signInAsGuest(): Promise<void> {
    await signInAnonymously(auth);
  }

  async function logout(): Promise<void> {
    await signOut(auth);
  }

  async function updateDisplayName(name: string): Promise<void> {
    const current = auth.currentUser;
    if (!current) throw new Error("You're not signed in.");
    await updateProfile(current, { displayName: name });
    await upsertUserProfile(current);
    // Reflect the new name locally; the Firestore snapshot also picks it up.
    setUser(auth.currentUser);
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const current = auth.currentUser;
    if (!current?.email) {
      throw new Error("This account doesn't use a password.");
    }
    const credential = EmailAuthProvider.credential(
      current.email,
      currentPassword,
    );
    await reauthenticateWithCredential(current, credential);
    await updatePassword(current, newPassword);
  }

  async function sendVerificationEmail(): Promise<void> {
    const current = auth.currentUser;
    if (!current) throw new Error("You're not signed in.");
    await sendEmailVerification(current);
  }

  async function sendPasswordReset(email?: string): Promise<void> {
    const target = email ?? auth.currentUser?.email;
    if (!target) throw new Error("No email address on file.");
    await sendPasswordResetEmail(auth, target);
  }

  async function deleteAccount(currentPassword?: string): Promise<void> {
    const current = auth.currentUser;
    if (!current) throw new Error("You're not signed in.");

    // Firebase requires a recent login before deletion. Reauthenticate with
    // whichever method the account uses.
    const providerId = current.providerData[0]?.providerId;
    if (providerId === "password") {
      if (!current.email || !currentPassword) {
        throw new Error("Enter your current password to confirm.");
      }
      const credential = EmailAuthProvider.credential(
        current.email,
        currentPassword,
      );
      await reauthenticateWithCredential(current, credential);
    } else if (providerId === "google.com") {
      await reauthenticateWithPopup(current, googleProvider);
    }

    // Best-effort: drop the profile mirror before removing the auth user.
    await deleteDoc(doc(db, "users", current.uid)).catch((error) =>
      console.error("Failed to delete user profile doc", error),
    );
    await deleteUser(current);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        logout,
        updateDisplayName,
        changePassword,
        sendVerificationEmail,
        sendPasswordReset,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
