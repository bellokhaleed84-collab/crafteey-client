"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { nairaText } from "@/lib/quoteShared";
import { JOB_LABEL, JOB_STEPS, type JobStatusKey } from "@/lib/jobShared";

type JobView = {
  id: string;
  conversationId: string;
  title: string;
  description: string;
  area: string;
  status: JobStatusKey;
  companyName: string;
  workerName: string | null;
  confirmedAt: string | null;
  onTheWayAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  paidKobo: number;
  payments: { title: string; kind: "main" | "additional"; totalKobo: number }[];
};

function when(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(
    new Date(iso)
  );
}

export default function WorkJobPage() {
  const { id } = useParams<{ id: string }>();
  const { getIdToken } = useAuth();
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch(getIdToken, `/api/company-jobs/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load this job.");
      setJob(data.job);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load this job.");
    }
  }, [id, getIdToken]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, [load]);

  if (error && !job) {
    return <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }
  if (!job) return <p className="text-sm text-steel">Loading...</p>;

  const stamp: Record<string, string | null> = {
    confirmed: job.confirmedAt,
    on_the_way: job.onTheWayAt,
    arrived: job.arrivedAt,
    completed: job.completedAt,
  };
  const reached = JOB_STEPS.indexOf(job.status);
  const who = job.workerName ?? job.companyName;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-steel">{job.companyName}</p>
        <h1 className="text-lg font-bold text-brand dark:text-white">{job.title}</h1>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
          {job.description}
        </p>
        {job.area && <p className="mt-1 text-xs text-steel">{job.area}</p>}
      </div>

      {job.status === "cancelled" ? (
        <p className="rounded-2xl bg-slate-100 p-4 text-center font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Job cancelled
        </p>
      ) : (
        <ol className="space-y-4 rounded-2xl bg-white p-5 shadow-card dark:bg-slate-800">
          {JOB_STEPS.map((s, i) => {
            const done = i <= reached;
            return (
              <li key={s} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                    done ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  {done && <Check className="h-4 w-4" strokeWidth={3} />}
                </span>
                <div>
                  <p className={`text-sm font-semibold ${done ? "text-brand dark:text-white" : "text-steel"}`}>
                    {JOB_LABEL[s]}
                  </p>
                  {stamp[s] && <p className="text-xs text-steel">{when(stamp[s])}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-card dark:bg-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-steel">Your technician</p>
        <p className="mt-1 font-bold text-brand dark:text-white">{who}</p>
        {job.workerName && <p className="text-xs text-steel">from {job.companyName}</p>}
      </div>

      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-card dark:bg-slate-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-steel">Payments</p>
        {job.payments.map((p, n) => (
          <div key={n} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>{p.kind === "additional" ? `Additional: ${p.title}` : p.title}</span>
            <span>{nairaText(p.totalKobo)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-brand dark:border-slate-700 dark:text-white">
          <span>Total paid</span>
          <span>{nairaText(job.paidKobo)}</span>
        </div>
      </div>

      <Link
        href={`/dashboard/chats/${job.conversationId}`}
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-accent px-5 font-semibold text-white"
      >
        Open chat
      </Link>
    </div>
  );
}