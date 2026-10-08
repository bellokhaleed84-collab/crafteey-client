"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";
import { authErrorMessage } from "@/lib/firebase/socialAuth";
import {
  BackButton,
  CheckIcon,
  ErrorNote,
  Field,
  LockIcon,
  MailIcon,
  PrimaryButton,
  Screen,
} from "@/components/auth/AuthParts";

const RESEND_SECONDS = 45;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!sent || seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, seconds]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    const em = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, em);
    } catch (err) {
      // "No account with this email" shows the same screen, so nobody can use
      // this form to find out who has an account.
      if ((err as { code?: string })?.code !== "auth/user-not-found") {
        setError(authErrorMessage(err) || null);
        setSubmitting(false);
        return;
      }
    }
    setSent(true);
    setSeconds(RESEND_SECONDS);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <Screen>
        <BackButton onClick={() => setSent(false)} />

        <div className="mx-auto mt-6 flex h-28 w-28 items-center justify-center rounded-full bg-amber-50 dark:bg-white/10">
          <div className="relative text-[#4002AF] dark:text-white">
            <MailIcon className="h-14 w-14" />
            <span className="absolute -bottom-1 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-black">
              <CheckIcon className="h-4 w-4" />
            </span>
          </div>
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-[#4002AF] dark:text-white">
          Check Your Email
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-center text-sm text-slate-500">
          We&apos;ve sent a password reset link to{" "}
          <span className="font-semibold text-slate-700">{email.trim()}</span>. Open it to choose a
          new password. Check your spam folder too.
        </p>

        <div className="mt-8">
          <PrimaryButton type="button" onClick={() => router.push("/login")}>
            Back to Log In
          </PrimaryButton>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          Didn&apos;t receive it?{" "}
          {seconds > 0 ? (
            <span className="font-semibold text-amber-600">
              Resend (00:{String(seconds).padStart(2, "0")})
            </span>
          ) : (
            <button
              type="button"
              onClick={() => send()}
              disabled={submitting}
              className="font-semibold text-amber-600 disabled:opacity-60"
            >
              Resend
            </button>
          )}
        </p>
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton onClick={() => router.push("/login")} />

      <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#4002AF]/10 text-[#4002AF] dark:text-white">
        <LockIcon className="h-11 w-11" />
      </div>

      <h1 className="mt-6 text-center text-2xl font-bold text-[#4002AF] dark:text-white">
        Forgot Password?
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-sm text-slate-500">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={send} className="mt-8 space-y-3.5">
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
        <ErrorNote message={error} />
        <PrimaryButton type="submit" loading={submitting}>
          Send Reset Link
        </PrimaryButton>
      </form>

      <p className="mt-auto pt-8 text-center text-sm text-slate-500">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-amber-600">
          Log In
        </Link>
      </p>
    </Screen>
  );
}