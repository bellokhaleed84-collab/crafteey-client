"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { Skeleton } from "@/components/ui/Skeleton";
import SettingsHeader from "@/components/SettingsHeader";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLE } from "@/lib/supportLabels";

type Row = {
  id: string;
  category: string;
  subject: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadClient: number;
};

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }).format(
    new Date(iso)
  );
}

export default function MyReportsPage() {
  const { user, getIdToken } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(getIdToken, "/api/support/tickets");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Couldn't load your reports.");
          return;
        }
        setRows(Array.isArray(data.tickets) ? data.tickets : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load your reports.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken]);

  return (
    <div className="space-y-6">
      <SettingsHeader title="My reports" subtitle="Your reports and our replies." />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {!rows && !error && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No reports yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            If something goes wrong, tell us and we will help you fix it.
          </p>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/settings/support/tickets/${r.id}`}
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      STATUS_STYLE[r.status] || STATUS_STYLE.open
                    }`}
                  >
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {CATEGORY_LABELS[r.category] || r.category}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{r.subject}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{r.lastMessage}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-slate-400">{dayLabel(r.lastMessageAt)}</span>
                {r.unreadClient > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1.5 text-[11px] font-bold text-white">
                    {r.unreadClient}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/settings/support/report"
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand-accent text-base font-semibold text-white shadow-sm transition hover:opacity-90"
      >
        <Plus className="h-5 w-5" />
        Report a problem
      </Link>
    </div>
  );
}