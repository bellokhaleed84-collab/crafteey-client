"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";
import { LogOut, Moon, Sun, KeyRound, Trash2, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const { client, user, signOut, getIdToken } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [resetStatus, setResetStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
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

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      router.replace("/login");
    } catch {
      setDeleteError("Couldn't delete your account. Try again or contact support.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-brand dark:text-white">Settings</h1>

      {/* Account */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Account
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Name</p>
          <p className="mb-3 font-semibold text-slate-900 dark:text-slate-100">{client?.name}</p>
          {client?.phone && (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
              <p className="mb-3 font-semibold text-slate-900 dark:text-slate-100">{client.phone}</p>
            </>
          )}
          {user?.email && (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{user.email}</p>
            </>
          )}
        </div>
      </section>

      {/* Security */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Security
        </p>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
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

      {/* Appearance */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Appearance
        </p>
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-slate-500 dark:text-slate-300" />
            ) : (
              <Sun className="h-5 w-5 text-slate-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dark mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {theme === "dark" ? "Currently on" : "Currently off"}
              </p>
            </div>
          </div>

          <button
            role="switch"
            aria-checked={theme === "dark"}
            onClick={toggleTheme}
            className={`relative h-7 w-12 rounded-full transition ${
              theme === "dark" ? "bg-brand-accent" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-red-400 dark:text-red-500/80">
          Danger zone
        </p>
        <div className="rounded-2xl border border-red-100 bg-white shadow-sm dark:border-red-900/40 dark:bg-slate-900">
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex w-full items-center gap-3 px-6 py-4 text-left transition hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete account</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanently remove your account and job history
              </p>
            </div>
          </button>
        </div>
      </section>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-red-950/30"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>

      {deleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <h2 className="mb-2 text-base font-bold text-slate-900 dark:text-slate-100">Delete your account?</h2>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              This can't be undone. All your jobs, deliveries, and account data will be permanently removed.
            </p>
            {deleteError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}