"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DICTIONARIES, isLangCode, type LangCode } from "@/lib/i18n/translations";

const STORAGE_KEY = "language";

interface I18nValue {
  lang: LangCode;
  setLang: (code: LangCode) => void;
  t: (text: string) => string;
}

const I18nContext = createContext<I18nValue>({ lang: "en", setLang: () => {}, t: (s) => s });

export function I18nProvider({ children }: { children: ReactNode }) {
  const { client } = useAuth();
  const [lang, setLangState] = useState<LangCode>("en");

  const apply = useCallback((code: LangCode) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {}
    document.documentElement.lang = code;
  }, []);

  // 1. Use what this device remembers, so there is no flash of English on the next visit.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isLangCode(stored)) apply(stored);
    } catch {}
  }, [apply]);

  // 2. When the account loads, use the language saved on it (so it follows the person to a new phone).
  const saved = client?.language;
  useEffect(() => {
    if (isLangCode(saved)) apply(saved);
  }, [saved, apply]);

  const t = useCallback((text: string) => DICTIONARIES[lang][text] ?? text, [lang]);
  const value = useMemo(() => ({ lang, setLang: apply, t }), [lang, apply, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}