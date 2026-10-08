"use client";

import { useState } from "react";
import { Moon, Sun, Bell, Mail as MailIcon, Globe, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { LANGUAGES, type LangCode } from "@/lib/i18n/translations";
import SettingsHeader from "@/components/SettingsHeader";
import Toggle from "@/components/ui/Toggle";

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

export default function PreferencesPage() {
  const { client, getIdToken, refetchClient } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();

  const [notifyEmail, setNotifyEmail] = useState(client?.notifyEmail ?? true);
  const [notifyPush, setNotifyPush] = useState(client?.notifyPush ?? true);
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

  function chooseLanguage(code: LangCode) {
    setLang(code); // changes the text straight away
    void savePreference({ language: code }); // and remembers it on the account
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title={t("Preferences")} subtitle={t("Notifications, language and appearance.")} />

      {/* Notifications */}
      <section className="space-y-3">
        <SectionTitle>{t("Notifications")}</SectionTitle>
        <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-800`}>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Bubble>
                <MailIcon className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("Email")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("Order and delivery updates by email.")}</p>
              </div>
            </div>
            <Toggle
              label={t("Email notifications")}
              checked={notifyEmail}
              disabled={saving}
              onChange={() => {
                const next = !notifyEmail;
                setNotifyEmail(next);
                void savePreference({ notifyEmail: next });
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Bubble>
                <Bell className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("Push")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("Real-time alerts in the app.")}</p>
              </div>
            </div>
            <Toggle
              label={t("Push notifications")}
              checked={notifyPush}
              disabled={saving}
              onChange={() => {
                const next = !notifyPush;
                setNotifyPush(next);
                void savePreference({ notifyPush: next });
              }}
            />
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="space-y-3">
        <SectionTitle>{t("Language")}</SectionTitle>
        <div className={CARD}>
          <div className="flex items-center gap-3 px-4 pt-3.5">
            <Bubble>
              <Globe className="h-5 w-5" />
            </Bubble>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("Display language")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("Your choice is saved and applies across the app.")}
              </p>
            </div>
          </div>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {LANGUAGES.map((l) => {
              const selected = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => chooseLanguage(l.code)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <span
                    className={`text-sm ${
                      selected ? "font-semibold text-brand-accent" : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {l.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-brand-accent" />}
                </button>
              );
            })}
          </div>
          {lang !== "en" && (
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {t("Some screens are still being translated.")}
            </p>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-3">
        <SectionTitle>{t("Appearance")}</SectionTitle>
        <div className={`${CARD} flex items-center justify-between gap-3 px-4 py-3.5`}>
          <div className="flex items-center gap-3">
            <Bubble>{theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</Bubble>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("Dark mode")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {theme === "dark" ? t("Currently on.") : t("Currently off.")}
              </p>
            </div>
          </div>
          <Toggle label={t("Dark mode")} checked={theme === "dark"} onChange={toggleTheme} />
        </div>
      </section>
    </div>
  );
}