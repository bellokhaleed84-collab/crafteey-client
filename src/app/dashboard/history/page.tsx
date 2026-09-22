"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, Wrench, Clock, PackageOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { JOB_STATUS, COURIER_STATUS } from "@/lib/constants";
import { SkeletonList } from "@/components/ui/Skeleton";

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

const STATUS_STYLE: Record<"done" | "cancelled" | "active", { dot: string; text: string; bg: string }> = {
  done: { dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
  cancelled: { dot: "bg-slate-400", text: "text-slate-500", bg: "bg-slate-100" },
  active: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
};

function statusKeyFor(status: string): keyof typeof STATUS_STYLE {
  if (status === JOB_STATUS.CANCELLED || status === COURIER_STATUS.CANCELLED) return "cancelled";
  if (status === JOB_STATUS.COMPLETED || status === COURIER_STATUS.DELIVERED) return "done";
  return "active";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

type FilterKey = "all" | "courier" | "job";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "courier", label: "Rides" },
  { key: "job", label: "Technicians" },
];

export default function HistoryPage() {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

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

  const visibleItems = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.type === filter)),
    [items, filter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    for (const item of visibleItems) {
      const key = dayLabel(item.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-brand">History</h1>
        <p className="text-sm text-steel">Your rides and technician jobs, in one place.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                active ? "bg-sunshine text-brand shadow-sm" : "bg-surface-muted text-steel hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-10 text-center shadow-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-steel">
            <PackageOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-brand">Nothing here yet</p>
            <p className="mt-1 text-sm text-steel">
              {filter === "all"
                ? "Your rides and technician jobs will show up here."
                : `You haven't booked ${filter === "job" ? "a technician" : "a ride"} yet.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([label, dayItems]) => (
            <div key={label} className="space-y-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-steel">
                <Clock className="h-3.5 w-3.5" />
                {label}
              </p>
              {dayItems.map((item) => {
                const Icon = item.type === "job" ? Wrench : Bike;
                const status = STATUS_STYLE[statusKeyFor(item.status)];
                return (
                  <div
                    key={`${item.type}-${item._id}`}
                    className="flex gap-3 rounded-2xl bg-white p-4 shadow-card transition active:scale-[0.99]"
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        item.type === "job" ? "bg-brand/10 text-brand" : "bg-sunshine/40 text-brand"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-steel">
                            {item.type === "job" ? "Technician" : "Delivery"}
                          </span>
                          <p className="truncate font-semibold text-brand">{item.title}</p>
                          <p className="mt-0.5 truncate text-sm text-steel">{item.subtitle}</p>
                        </div>
                        <span
                          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.bg} ${status.text}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {labelFor(item)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-steel">{formatWhen(item.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}