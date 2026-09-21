"use client";

import { useState } from "react";
import { KeyRound, Mail, Pencil, Phone, User, ChevronRight, BadgeCheck } from "lucide-react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase/clientApp";
import SettingsHeader from "@/components/SettingsHeader";

const CARD =
  "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const INPUT =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-accent focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const LABEL = "text-xs font-semibold text-slate-500 dark:text-slate-400";
const BTN_PRIMARY =
  "flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60";
const BTN_GHOST =
  "flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">{children}</h2>;
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-accent dark:bg-slate-800">
      {children}
    </span>
  );
}

export default function ProfileSettingsPage() {
  const { client, user, getIdToken, refetchClient } = useAuth();

  const [editingBasics, setEditingBasics] = useState(false);
  const [name, setName] = useState(client?.name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [savingBasics, setSavingBasics] = useState(false);
  const [basicsError, setBasicsError] = useState<string | null>(null);

  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSaveBasics() {
    setBasicsError(null);
    setSavingBasics(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/clients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your changes.");
      }
      await refetchClient();
      setEditingBasics(false);
    } catch (err: any) {
      setBasicsError(err.message || "Couldn't save your changes.");
    } finally {
      setSavingBasics(false);
    }
  }

  async function handleChangeEmail() {
    if (!user?.email) return;
    setEmailError(null);
    setEmailStatus("sending");
    try {
      // Firebase needs a recent sign-in before changing the auth email.
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // The email only switches once the link sent to the NEW address is clicked.
      await verifyBeforeUpdateEmail(user, newEmail);
      setEmailStatus("sent");
    } catch (err: any) {
      setEmailStatus("error");
      setEmailError(
        err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential"
          ? "That password isn't correct."
          : err?.code === "auth/invalid-email"
          ? "That doesn't look like a valid email address."
          : "Couldn't start the email change. Try again."
      );
    }
  }

  async function handleResetPassword() {
    if (!user?.email) return;
    setResetStatus("sending");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetStatus("sent");
    } catch {
      setResetStatus("error");
    }
  }

  const initials =
    (client?.name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "C";

  return (
    <div className="space-y-6">
      <SettingsHeader title="My Profile" subtitle="View and edit your personal information." />

      {/* Identity card */}
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-50 p-4 ring-1 ring-yellow-200/60 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 dark:ring-slate-700">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xl font-extrabold text-slate-900 ring-4 ring-white/80 dark:ring-slate-700">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{client?.name}</p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-brand-accent dark:bg-slate-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified User
          </span>
        </div>
      </div>

      {/* Basics */}
      <section className="space-y-3">
        <SectionTitle>Personal details</SectionTitle>
        <div className={`${CARD} p-4`}>
          {editingBasics ? (
            <div className="space-y-4">
              <div>
                <label className={LABEL}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT} />
              </div>
              {basicsError && <p className="text-sm text-red-600 dark:text-red-400">{basicsError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingBasics(false);
                    setName(client?.name ?? "");
                    setPhone(client?.phone ?? "");
                    setBasicsError(null);
                  }}
                  disabled={savingBasics}
                  className={BTN_GHOST}
                >
                  Cancel
                </button>
                <button onClick={handleSaveBasics} disabled={savingBasics} className={BTN_PRIMARY}>
                  {savingBasics ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Bubble>
                  <User className="h-5 w-5" />
                </Bubble>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{client?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Bubble>
                  <Phone className="h-5 w-5" />
                </Bubble>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{client?.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingBasics(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-brand-accent transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <Pencil className="h-4 w-4" />
                Edit details
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Email */}
      <section className="space-y-3">
        <SectionTitle>Email</SectionTitle>
        <div className={`${CARD} p-4`}>
          <div className="flex items-center gap-3">
            <Bubble>
              <Mail className="h-5 w-5" />
            </Bubble>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">Current email</p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.email}</p>
            </div>
          </div>

          {!changingEmail ? (
            <button
              onClick={() => setChangingEmail(true)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-brand-accent transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Change email
            </button>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className={LABEL}>Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>New email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={INPUT}
                />
              </div>
              {emailStatus === "sent" && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Check {newEmail} for a verification link. Your email updates once you click it.
                </p>
              )}
              {emailError && <p className="text-sm text-red-600 dark:text-red-400">{emailError}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setChangingEmail(false);
                    setEmailStatus("idle");
                    setEmailError(null);
                    setNewEmail("");
                    setCurrentPassword("");
                  }}
                  className={BTN_GHOST}
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeEmail}
                  disabled={emailStatus === "sending" || !newEmail || !currentPassword}
                  className={BTN_PRIMARY}
                >
                  {emailStatus === "sending" ? "Sending…" : "Send verification"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="space-y-3">
        <SectionTitle>Security</SectionTitle>
        <div className={CARD}>
          <button
            onClick={handleResetPassword}
            disabled={resetStatus === "sending"}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-3">
              <Bubble>
                <KeyRound className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Change password</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resetStatus === "sent"
                    ? `Reset link sent to ${user?.email}`
                    : resetStatus === "error"
                    ? "Couldn't send the link. Try again."
                    : resetStatus === "sending"
                    ? "Sending…"
                    : "We'll email you a reset link."}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </button>
        </div>
      </section>
    </div>
  );
}