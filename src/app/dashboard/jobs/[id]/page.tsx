"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode.react";
import { useAuth } from "@/contexts/AuthContext";
import { JOB_STATUS } from "@/lib/constants";

interface Job {
  _id: string;
  category: string;
  issueType: string;
  description: string;
  area: string;
  photoUrls: string[];
  videoUrls: string[];
  status: string;
  technicianName: string | null;
  technicianPhone: string | null;
  qrToken: string | null;
  createdAt: string;
}

const HOTLINE = process.env.NEXT_PUBLIC_SUPPORT_HOTLINE ?? "";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getIdToken } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJob = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Job not found");
      const data = await res.json();
      setJob(data.job);
    } catch {
      setError("Couldn't load this job.");
    } finally {
      setLoading(false);
    }
  }, [id, getIdToken]);

  useEffect(() => {
    loadJob();
    // Poll for status updates every 8s — dispatch/arrival happen on the
    // admin/technician side, so this screen needs to catch up on its own.
    const interval = setInterval(loadJob, 8000);
    return () => clearInterval(interval);
  }, [loadJob]);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;
  }

  if (error || !job) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Job not found."}</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-brand dark:text-white">{job.category}</h1>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{job.issueType}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{job.description}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{job.area}</p>
      </div>

      {(job.photoUrls.length > 0 || job.videoUrls.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {job.photoUrls.map((url) => (
            <img key={url} src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
          ))}
          {job.videoUrls.map((url) => (
            <video key={url} src={url} className="h-20 w-20 rounded-lg object-cover" muted />
          ))}
        </div>
      )}

      {job.status === JOB_STATUS.PENDING && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-900/50 dark:bg-amber-900/20">
          <p className="font-semibold text-amber-900 dark:text-amber-400">We're finding you a pro</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
            This usually takes a few minutes. Haven't heard back yet?
          </p>
          {HOTLINE && (
            
              href={`tel:${HOTLINE}`}
              className="mt-3 inline-block rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Call us: {HOTLINE}
            </a>
          )}
        </div>
      )}

      {(job.status === JOB_STATUS.DISPATCHED || job.status === JOB_STATUS.ON_THE_WAY) && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/50 dark:bg-blue-900/20">
          <p className="font-semibold text-blue-900 dark:text-blue-400">
            {job.status === JOB_STATUS.ON_THE_WAY ? "Your pro is on the way" : "A pro has been assigned"}
          </p>
          {job.technicianName && (
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-500">{job.technicianName}</p>
          )}
          {job.technicianPhone && (
            
              href={`tel:${job.technicianPhone}`}
              className="mt-3 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Call {job.technicianName ?? "your pro"}: {job.technicianPhone}
            </a>
          )}

          {job.status === JOB_STATUS.ON_THE_WAY && job.qrToken && (
            <div className="mt-5 flex flex-col items-center rounded-xl bg-white p-4">
              <p className="mb-3 text-center text-xs font-semibold text-slate-600">
                Show this code to your pro when they arrive
              </p>
              <QRCode value={job.qrToken} size={160} />
            </div>
          )}
        </div>
      )}

      {job.status === JOB_STATUS.ARRIVED && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 text-center dark:border-purple-900/50 dark:bg-purple-900/20">
          <p className="font-semibold text-purple-900 dark:text-purple-400">Your pro has arrived</p>
          <p className="mt-1 text-sm text-purple-700 dark:text-purple-500">Work is starting now.</p>
        </div>
      )}

      {job.status === JOB_STATUS.COMPLETED && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900/50 dark:bg-emerald-900/20">
          <p className="font-semibold text-emerald-900 dark:text-emerald-400">Job completed</p>
          <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-500">Thanks for using Crafteey!</p>
        </div>
      )}

      {job.status === JOB_STATUS.CANCELLED && (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 text-center dark:border-slate-800 dark:bg-slate-800">
          <p className="font-semibold text-slate-700 dark:text-slate-300">Job cancelled</p>
        </div>
      )}
    </div>
  );
}