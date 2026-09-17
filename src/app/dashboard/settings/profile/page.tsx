"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, KeyRound, Mail, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";

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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
      // Firebase requires a recent sign-in before letting you change the
      // auth email — re-authenticate with the current password first.
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      // Sends a verification link to the NEW address; the email on the
      // account only actually changes once that link is clicked — safer
      // than updating it immediately, since it confirms the new address
      // is real and belongs to this person before anything switches over.
      await verifyBeforeUpdateEmail(user, newEmail);
      setEmailStatus("sent");
    } catch (err: any) {
      setEmailStatus("error");
      setEmailError(
        err?.code === "auth/wrong-password"
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

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>
      <h1 className="text-lg font-bold text-brand dark:text-white">Profile</h1>

      {/* Basics */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Basics
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {editingBasics ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
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
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBasics}
                  disabled={savingBasics}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-60"
                >
                  {savingBasics ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Name</p>
                <p className="mb-3 font-semibold text-slate-900 dark:text-slate-100">{client?.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{client?.phone}</p>
              </div>
              <button
                onClick={() => setEditingBasics(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-brand-accent transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Email */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Email
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Current email</p>
          <p className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{user?.email}</p>

          {!changingEmail ? (
            <button
              onClick={() => setChangingEmail(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-accent"
            >
              <Mail className="h-3.5 w-3.5" />
              Change email
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  New email
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
              {emailStatus === "sent" && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Check {newEmail} for a verification link — your email updates once you click it.
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
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangeEmail}
                  disabled={emailStatus === "sending" || !newEmail || !currentPassword}
                  className="flex-1 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-60"
                >
                  {emailStatus === "sending" ? "Sending…" : "Send verification"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Security
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={handleResetPassword}
            disabled={resetStatus === "sending"}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Change password</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {resetStatus === "sent"
                    ? `Reset link sent to ${user?.email}`
                    : resetStatus === "error"
                    ? "Couldn't send the link. Try again."
                    : resetStatus === "sending"
                    ? "Sending…"
                    : "We'll email you a reset link"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          </button>
        </div>
      </section>
    </div>
  );
}