"use client";

import { useState } from "react";
import { Moon, Sun, Bell, Mail as MailIcon, Globe, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import SettingsHeader from "@/components/SettingsHeader";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "fr", label: "French" },
];

const CARD =
  "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

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

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
        checked ? "bg-brand-accent" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(update),
      });
      await refetchClient();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title="Preferences" subtitle="Notifications, language and appearance." />

      {/* Notifications */}
      <section className="space-y-3">
        <SectionTitle>Notifications</SectionTitle>
        <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-800`}>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Bubble>
                <MailIcon className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Email</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Order and delivery updates by email.</p>
              </div>
            </div>
            <Toggle
              label="Email notifications"
              checked={notifyEmail}
              disabled={saving}
              onChange={() => {
                const next = !notifyEmail;
                setNotifyEmail(next);
                savePreference({ notifyEmail: next });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Bubble>
                <Bell className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Push</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Real-time alerts in the app.</p>
              </div>
            </div>
            <Toggle
              label="Push notifications"
              checked={notifyPush}
              disabled={saving}
              onChange={() => {
                const next = !notifyPush;
                setNotifyPush(next);
                savePreference({ notifyPush: next });
              }}
            />
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="space-y-3">
        <SectionTitle>Language</SectionTitle>
        <div className={CARD}>
          <div className="flex items-center gap-3 px-4 pt-3.5">
            <Bubble>
              <Globe className="h-5 w-5" />
            </Bubble>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Display language</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your choice is saved. Full translation isn't live yet.
              </p>
            </div>
          </div>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {LANGUAGES.map((l) => {
              const selected = language === l.code;
              return (
                <button
                  key={l.code}
                  disabled={saving}
                  onClick={() => {
                    setLanguage(l.code);
                    savePreference({ language: l.code });
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={`text-sm ${
                      selected
                        ? "font-semibold text-brand-accent"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {l.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-brand-accent" />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <SectionTitle>Appearance</SectionTitle>
        <div className={`${CARD} flex items-center justify-between gap-3 px-4 py-3.5`}>
          <div className="flex items-center gap-3">
            <Bubble>
              {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Bubble>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dark mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {theme === "dark" ? "Currently on." : "Currently off."}
              </p>
            </div>
          </div>
          <Toggle label="Dark mode" checked={theme === "dark"} onChange={toggleTheme} />
        </div>
      </section>
    </div>
  );
}