import { FirebaseError } from "firebase/app";

/**
 * Map a Firebase Auth error (or anything thrown) to a short, human-friendly
 * message. Shared by the auth screen and the account-settings flows so the
 * copy stays consistent across sign-in, password change, and account deletion.
 */
export function friendlyAuthError(err: unknown): string {
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
      case "auth/requires-recent-login":
        return "For your security, please sign in again before making this change.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a moment and try again.";
      case "auth/popup-closed-by-user":
        return "That was cancelled. Please try again.";
      case "auth/popup-blocked":
        return "Your browser blocked the popup. Allow popups and try again.";
      case "auth/operation-not-allowed":
      case "auth/admin-restricted-operation":
        return "This sign-in method isn't enabled yet (Firebase console → Authentication).";
      case "auth/unauthorized-domain":
        return "This domain isn't authorized for sign-in (Firebase console → Authentication → Settings → Authorized domains).";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return "Something went wrong. Please try again.";
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Please try again.";
}
