"use client";

import { useEffect, useState } from "react";
import SettingsHeader from "@/components/SettingsHeader";
import { Skeleton } from "@/components/ui/Skeleton";

type Terms = { title: string; body: string; version: number; updatedAt: string | null };

type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

function parse(body: string): Block[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): Block => {
      const lines = b.split("\n").map((l) => l.trim());
      if (lines.length === 1 && lines[0].startsWith("# ")) {
        return { kind: "heading", text: lines[0].slice(2).trim() };
      }
      if (lines.every((l) => l.startsWith("- "))) {
        return { kind: "list", items: lines.map((l) => l.slice(2).trim()) };
      }
      return { kind: "paragraph", text: b };
    });
}

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export default function TermsPage() {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/legal/terms", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Couldn't load the terms.");
          return;
        }
        setTerms(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load the terms.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <SettingsHeader title="Terms & Conditions" subtitle="Please read these terms before you use Crafteey." />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {!terms && !error && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      )}

      {terms && (
        <article className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {terms.updatedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-400">Last updated {dayLabel(terms.updatedAt)}</p>
          )}
          {parse(terms.body).map((b, i) => {
            if (b.kind === "heading") {
              return (
                <h2 key={i} className="pt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  {b.text}
                </h2>
              );
            }
            if (b.kind === "list") {
              return (
                <ul key={i} className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                  {b.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                {b.text}
              </p>
            );
          })}
        </article>
      )}
    </div>
  );
}