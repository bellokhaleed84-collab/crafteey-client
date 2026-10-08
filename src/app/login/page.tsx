"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";
import { useAuth } from "@/contexts/AuthContext";
import {
  APPLE_SIGN_IN_ENABLED,
  authErrorMessage,
  signInWithApple,
  signInWithGoogle,
} from "@/lib/firebase/socialAuth";
import {
  AppleIcon,
  AuthLogo,
  Divider,
  ErrorNote,
  Field,
  GoogleIcon,
  MailIcon,
  OptionButton,
  PasswordField,
  PrimaryButton,
  Screen,
} from "@/components/auth/AuthParts";

export default function LoginPage() {
  const router = useRouter();
  const { user, client, loading, profileError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"google" | "apple" | null>(null);

  // Once signed in (email, Google or Apple) send them where they belong.
  useEffect(() => {
    if (loading || !user) return;
    if (client) router.replace("/dashboard");
    else if (!profileError) router.replace("/register");
  }, [loading, user, client, profileError, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err) || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSocial(kind: "google" | "apple") {
    setError(null);
    setSocialBusy(kind);
    try {
      await (kind === "google" ? signInWithGoogle() : signInWithApple());
    } catch (err) {
      setError(authErrorMessage(err) || null);
    } finally {
      setSocialBusy(null);
    }
  }

  return (
    <Screen>
      <AuthLogo />

      <h1 className="mt-10 text-2xl font-bold text-[#4002AF] dark:text-white">Welcome Back</h1>
      <p className="mt-1 text-sm text-slate-500">Log in to your account</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-3.5">
        <Field
          label="Email"
          icon={<MailIcon />}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
        />
        <PasswordField
          label="Password"
          required
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={setPassword}
        />

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-[#4002AF]"
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-amber-600">
            Forgot Password?
          </Link>
        </div>

        <ErrorNote message={error} />

        <PrimaryButton type="submit" loading={submitting}>
          Log In
        </PrimaryButton>
      </form>

      <div className="my-5">
        <Divider />
      </div>

      <div className="space-y-3">
        <OptionButton
          icon={<GoogleIcon />}
          label="Continue with Google"
          loading={socialBusy === "google"}
          onClick={() => handleSocial("google")}
        />
        {APPLE_SIGN_IN_ENABLED && (
          <OptionButton
            icon={<AppleIcon />}
            label="Continue with Apple"
            loading={socialBusy === "apple"}
            onClick={() => handleSocial("apple")}
          />
        )}
      </div>

      <p className="mt-auto pt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-amber-600">
          Sign Up
        </Link>
      </p>
    </Screen>
  );
}