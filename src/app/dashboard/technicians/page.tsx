"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Droplet, Zap, PaintBucket, Hammer } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { JOB_STATUS } from "@/lib/constants";

interface Job {
  _id: string;
  category: string;
  description: string;
  area: string;
  status: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  [JOB_STATUS.PENDING]: "Finding a pro",
  [JOB_STATUS.DISPATCHED]: "Pro assigned",
  [JOB_STATUS.ON_THE_WAY]: "On the way",
  [JOB_STATUS.ARRIVED]: "Arrived",
  [JOB_STATUS.COMPLETED]: "Completed",
  [JOB_STATUS.CANCELLED]: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  [JOB_STATUS.PENDING]: "bg-amber-100 text-amber-700",
  [JOB_STATUS.DISPATCHED]: "bg-blue-100 text-blue-700",
  [JOB_STATUS.ON_THE_WAY]: "bg-blue-100 text-blue-700",
  [JOB_STATUS.ARRIVED]: "bg-purple-100 text-purple-700",
  [JOB_STATUS.COMPLETED]: "bg-emerald-100 text-emerald-700",
  [JOB_STATUS.CANCELLED]: "bg-slate-200 text-slate-600",
};

// Quick shortcuts straight into "Post a job" with the trade pre-selected.
// post-job/page.tsx needs to read this ?category= param and preselect it
// for these to actually save a step — check that file if it doesn't yet.
const TRADE_SHORTCUTS = [
  { label: "Plumbing", icon: Droplet, tone: "bg-brand-accent/10 text-brand-accent" },
  { label: "Electrical", icon: Zap, tone: "bg-sunshine/20 text-sunshine-dark" },
  { label: "Painting", icon: PaintBucket, tone: "bg-emerald-100 text-emerald-700" },
  { label: "Carpentry", icon: Hammer, tone: "bg-brand/10 text-brand" },
];

export default function TechniciansPage() {
  const { getIdToken } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand">Technicians</h1>
        <Link
          href="/dashboard/post-job"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
        >
          + Post a job
        </Link>
      </div>

      {/* Trust banner */}
      <div className="rounded-2xl bg-brand-accent p-5 text-white shadow-card-lg">
        <p className="text-base font-extrabold">Skilled Technicians You Can Trust</p>
        <p className="mt-1 text-xs text-white/80">Verified professionals for your home and business</p>
      </div>

      {/* Trade shortcuts */}
      <div className="grid grid-cols-4 gap-2.5">
        {TRADE_SHORTCUTS.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.label}
              href={`/dashboard/post-job?category=${encodeURIComponent(t.label)}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-card transition hover:shadow-card-lg"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${t.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-center text-[11px] font-semibold leading-tight text-brand">{t.label}</p>
            </Link>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-brand">Your requests</p>

        {loading ? (
          <p className="text-sm text-steel">Loading…</p>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-steel">You haven't posted a job yet.</p>
            <Link
              href="/dashboard/post-job"
              className="mt-3 inline-block text-sm font-semibold text-brand-accent underline underline-offset-2"
            >
              Post your first job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job._id}
                href={`/dashboard/jobs/${job._id}`}
                className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:border-brand-accent/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand">{job.category}</p>
                    <p className="mt-0.5 text-sm text-steel line-clamp-1">{job.description}</p>
                    <p className="mt-1 text-xs text-steel/70">{job.area}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[job.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}