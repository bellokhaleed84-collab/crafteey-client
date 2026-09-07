"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { JOB_STATUS, COURIER_STATUS } from "@/lib/constants";

interface FeedItem {
  _id: string;
  type: "job" | "courier";
  title: string;
  subtitle: string;
  status: string;
  createdAt: string;
}

const JOB_STATUS_LABEL: Record<string, string> = {
  [JOB_STATUS.PENDING]: "Finding a pro",
  [JOB_STATUS.DISPATCHED]: "Pro assigned",
  [JOB_STATUS.ON_THE_WAY]: "On the way",
  [JOB_STATUS.ARRIVED]: "Arrived",
  [JOB_STATUS.COMPLETED]: "Completed",
  [JOB_STATUS.CANCELLED]: "Cancelled",
};

const COURIER_STATUS_LABEL: Record<string, string> = {
  [COURIER_STATUS.PENDING]: "Finding a courier",
  [COURIER_STATUS.ACCEPTED]: "Courier assigned",
  [COURIER_STATUS.PICKED_UP]: "Picked up",
  [COURIER_STATUS.EN_ROUTE]: "On the way",
  [COURIER_STATUS.DELIVERED]: "Delivered",
  [COURIER_STATUS.CANCELLED]: "Cancelled",
};

function labelFor(item: FeedItem) {
  const map = item.type === "job" ? JOB_STATUS_LABEL : COURIER_STATUS_LABEL;
  return map[item.status] ?? item.status;
}

const STATUS_COLOR: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function colorFor(status: string) {
  if (status === JOB_STATUS.CANCELLED || status === COURIER_STATUS.CANCELLED) return STATUS_COLOR.cancelled;
  if (status === JOB_STATUS.COMPLETED || status === COURIER_STATUS.DELIVERED) return STATUS_COLOR.done;
  return STATUS_COLOR.active;
}

export default function HistoryPage() {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };

      const [jobsRes, courierRes] = await Promise.all([
        fetch("/api/jobs", { headers }),
        fetch("/api/courier-requests", { headers }),
      ]);

      const jobs = jobsRes.ok ? (await jobsRes.json()).jobs : [];
      const couriers = courierRes.ok ? (await courierRes.json()).requests : [];

      const merged: FeedItem[] = [
        ...jobs.map((j: any) => ({
          _id: j._id,
          type: "job" as const,
          title: j.category,
          subtitle: j.area,
          status: j.status,
          createdAt: j.createdAt,
        })),
        ...couriers.map((c: any) => ({
          _id: c._id,
          type: "courier" as const,
          title: "Courier delivery",
          subtitle: `${c.pickup} → ${c.dropoff}`,
          status: c.status,
          createdAt: c.createdAt,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setItems(merged);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">No jobs or deliveries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.type}-${item._id}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {item.type === "job" ? "Job" : "Delivery"}
              </span>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="mt-0.5 text-sm text-slate-500 line-clamp-1 dark:text-slate-400">{item.subtitle}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${colorFor(item.status)}`}>
              {labelFor(item)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}