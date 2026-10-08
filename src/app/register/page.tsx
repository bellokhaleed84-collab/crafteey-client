"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, deleteUser, type User } from "firebase/auth";
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
  BackButton,
  CheckIcon,
  ErrorNote,
  Field,
  GoogleIcon,
  MailIcon,
  OptionButton,
  PasswordField,
  PasswordRules,
  PhoneIcon,
  PrimaryButton,
  Screen,
  UserIcon,
  passwordChecks,
} from "@/components/auth/AuthParts";

type Step = "options" | "email" | "profile" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const { user, client, loading, profileError, refetchClient, signOut } = useAuth();

  const [step, setStep] = useState<Step>("options");
  const [social, setSocial] = useState(false); // true when they came in through Google/Apple
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"google" | "apple" | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || completedRef.current) return;
    if (client) {
      router.replace("/dashboard");
      return;
    }
    // Signed in (Google/Apple, or an old account) but no profile yet: finish it.
    if (!profileError && step === "options") {
      setSocial(true);
      setEmail(user.email ?? "");
      setName((n) => n || user.displayName || "");
      setStep("profile");
    }
  }, [loading, user, client, profileError, step, router]);

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

  function submitEmailStep(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!passwordChecks(password).every((c) => c.ok)) {
      setError("Your password doesn't meet all the requirements yet.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setStep("profile");
  }

  async function postProfile(token: string) {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create your profile");
    }
  }

  async function submitProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please add a valid email address.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }

    setSubmitting(true);
    let created: User | null = null;
    try {
      if (social) {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("Please sign in again.");
        await postProfile(token);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        created = cred.user;
        await postProfile(await created.getIdToken());
      }
      completedRef.current = true;
      await refetchClient();
      setStep("done");
    } catch (err) {
      // If the profile could not be saved, remove the brand-new Firebase user again.
      if (created) await deleteUser(created).catch(() => {});
      if ((err as { code?: string })?.code === "auth/email-already-in-use") {
        setStep("email");
      }
      setError(authErrorMessage(err) || null);
    } finally {
      setSubmitting(false);
    }
  }

  async function useDifferentAccount() {
    await signOut();
    setSocial(false);
    setEmail("");
    setName("");
    setError(null);
    setStep("options");
  }

  // ---------- Step 4: all set ----------
  if (step === "done") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2B0180] to-[#4002AF] px-8 text-center text-white">
        <div className="mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-[#2B0180]">
            <CheckIcon className="h-9 w-9" />
          </div>
        </div>
        <h1 className="text-3xl font-bold">You&apos;re All Set!</h1>
        <p className="mt-3 max-w-xs text-white/75">
          Your Crafteey account has been successfully created.
        </p>
        <div className="mt-10 w-full max-w-sm">
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            className="w-full rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-[#2B0180] shadow-lg shadow-black/20 active:scale-[0.99]"
          >
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  // ---------- Step 3: complete profile ----------
  if (step === "profile") {
    const emailEditable = social && !user?.email;
    return (
      <Screen>
        {social ? (
          <div className="h-10" />
        ) : (
          <BackButton
            onClick={() => {
              setError(null);
              setStep("email");
            }}
          />
        )}

        <h1 className="mt-2 text-2xl font-bold text-[#4002AF] dark:text-white">
          Complete Your Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">Help us serve you better</p>

        <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#4002AF]/10 text-2xl font-bold text-[#4002AF] dark:text-white">
          {name.trim() ? name.trim()[0].toUpperCase() : <UserIcon className="h-9 w-9" />}
        </div>

        <form onSubmit={submitProfile} className="mt-6 space-y-3.5">
          <Field
            label="Full Name"
            icon={<UserIcon />}
            required
            autoComplete="name"
            placeholder="Enter your full name"
            value={name}
            onChange={setName}
          />
          <Field
            label="Email Address"
            icon={<MailIcon />}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            readOnly={!emailEditable}
            tabIndex={emailEditable ? 0 : -1}
            value={email}
            onChange={setEmail}
          />
          <Field
            label="Phone Number"
            icon={<PhoneIcon />}
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            placeholder="0803 123 4567"
            value={phone}
            onChange={setPhone}
          />

          <ErrorNote message={error} />

          <PrimaryButton type="submit" loading={submitting}>
            Continue
          </PrimaryButton>
        </form>

        {social && (
          <button
            type="button"
            onClick={useDifferentAccount}
            className="mt-6 text-center text-sm font-semibold text-amber-600"
          >
            Use a different account
          </button>
        )}
      </Screen>
    );
  }

  // ---------- Step 2: email + password ----------
  if (step === "email") {
    return (
      <Screen>
        <BackButton
          onClick={() => {
            setError(null);
            setStep("options");
          }}
        />
        <h1 className="mt-2 text-2xl font-bold text-[#4002AF] dark:text-white">
          Sign Up with Email
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          You&apos;ll use these details to log in.
        </p>

        <form onSubmit={submitEmailStep} className="mt-7 space-y-3.5">
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
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            label="Confirm Password"
            required
            autoComplete="new-password"
            placeholder="Confirm your password"
            value={confirm}
            onChange={setConfirm}
          />
          <PasswordRules password={password} />

          <ErrorNote message={error} />

          <PrimaryButton type="submit">Continue</PrimaryButton>
        </form>

        <p className="mt-auto pt-8 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-amber-600">
            Log In
          </Link>
        </p>
      </Screen>
    );
  }

  // ---------- Step 1: choose how to sign up ----------
  return (
    <Screen>
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 -z-10 h-44 w-44 rotate-45 rounded-3xl bg-gradient-to-br from-amber-400/50 to-[#4002AF]/30"
      />

      <AuthLogo />

      <h1 className="mt-12 text-2xl font-bold text-[#4002AF] dark:text-white">
        Create Your Account
      </h1>
      <p className="mt-1 text-sm text-slate-500">Choose how you want to sign up</p>

      <div className="mt-8 space-y-3">
        <OptionButton
          primary
          icon={<MailIcon />}
          label="Continue with Email"
          onClick={() => {
            setError(null);
            setStep("email");
          }}
        />
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

      <div className="mt-4">
        <ErrorNote message={error} />
      </div>

      <p className="mt-auto pt-10 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-amber-600">
          Log In
        </Link>
      </p>
    </Screen>
  );
}