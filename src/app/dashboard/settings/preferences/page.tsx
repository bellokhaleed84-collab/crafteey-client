"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Moon, Sun, Bell, Mail as MailIcon, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "fr", label: "French" },
];

export default function PreferencesPage() {
  const { client, getIdToken, refetchClient } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [notifyEmail, setNotifyEmail] = useState(client?.notifyEmail ?? true);
  const [notifyPush, setNotifyPush] = useState(client?.notifyPush ?? true);
  const [language, setLanguage] = useState(client?.language ?? "en");
  const [saving, setSaving] = useState(false);

  async function savePreference(update: Record<string, unknown>) {
    setSaving(true);
    try {
      const token = await getIdToken();
      await fetch("/api/clients/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(update),
      });
      await refetchClient();
    } finally {
      setSaving(false);
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
      <h1 className="text-lg font-bold text-brand dark:text-white">Preferences</h1>

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

      {/* Notifications */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Notifications
        </p>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <MailIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Order and delivery updates by email</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={notifyEmail}
              disabled={saving}
              onClick={() => {
                const next = !notifyEmail;
                setNotifyEmail(next);
                savePreference({ notifyEmail: next });
              }}
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                notifyEmail ? "bg-brand-accent" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  notifyEmail ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Push</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Real-time alerts in the app</p>
              </div>
            </div>
            <button
              role="switch"
              aria-checked={notifyPush}
              disabled={saving}
              onClick={() => {
                const next = !notifyPush;
                setNotifyPush(next);
                savePreference({ notifyPush: next });
              }}
              className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                notifyPush ? "bg-brand-accent" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  notifyPush ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Language
        </p>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-3">
            <Globe className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Display language</p>
          </div>
          <select
            value={language}
            disabled={saving}
            onChange={(e) => {
              const next = e.target.value;
              setLanguage(next);
              savePreference({ language: next });
            }}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            This saves your preference — full translation isn't live yet.
          </p>
        </div>
      </section>
    </div>
  );
}