import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./clientApp";

// Set to false to hide the Apple button until Apple sign-in is set up in Firebase.
export const APPLE_SIGN_IN_ENABLED = true;

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export function signInWithApple() {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return signInWithPopup(auth, provider);
}

/** Turns a Firebase / API error into a message people can read. Returns "" when nothing should be shown. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Invalid email or password.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow pop-ups and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't switched on yet.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email. Sign in with your email and password instead.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a bit and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "That email doesn't look right.";
    default:
      if (code.startsWith("auth/")) return "Something went wrong. Please try again.";
      return (err as Error | null)?.message || "Something went wrong. Please try again.";
  }
}