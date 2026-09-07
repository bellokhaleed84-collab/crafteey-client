"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
  [JOB_STATUS.PENDING]: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  [JOB_STATUS.DISPATCHED]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [JOB_STATUS.ON_THE_WAY]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [JOB_STATUS.ARRIVED]: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  [JOB_STATUS.COMPLETED]: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  [JOB_STATUS.CANCELLED]: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

export default function DashboardHomePage() {
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-brand dark:text-white">Your jobs</h1>
        <Link
          href="/dashboard/post-job"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-light"
        >
          + Post a job
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">You haven't posted a job yet.</p>
          <Link
            href="/dashboard/post-job"
            className="mt-3 inline-block text-sm font-semibold text-brand underline underline-offset-2 dark:text-brand-accent"
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
              className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand-accent/40 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{job.category}</p>
                  <p className="mt-0.5 text-sm text-slate-500 line-clamp-1 dark:text-slate-400">{job.description}</p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{job.area}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[job.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                >
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}