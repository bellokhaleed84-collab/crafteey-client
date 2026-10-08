"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/components/ui/Skeleton";

interface Item {
  _id: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

function ago(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const { getIdToken } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.notifications ?? []);
      setError(null);
    } catch {
      setError("Couldn't load your notifications.");
      setItems((prev) => prev ?? []);
    }
  }, [getIdToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    const token = await getIdToken();
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).catch(() => {});
  }

  async function markAll() {
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    await patch({ all: true });
  }

  async function open(n: Item) {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x._id === n._id ? { ...x, read: true } : x)) ?? prev);
      await patch({ id: n._id });
    }
    if (n.link) router.push(n.link);
  }

  const unreadCount = items?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand dark:text-white">Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-accent transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {items === null ? (
        <SkeletonList count={4} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-10 text-center shadow-card dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-slate-800">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-muted text-steel dark:bg-slate-800">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-brand dark:text-white">No notifications yet</p>
            <p className="mt-1 text-sm text-steel">Updates on your orders and deliveries will show up here.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n._id}
              type="button"
              onClick={() => void open(n)}
              className={`flex w-full items-start gap-3 rounded-2xl p-4 text-left transition active:scale-[0.99] ${
                n.read
                  ? "bg-white shadow-card dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-slate-800"
                  : "bg-brand-accent/5 ring-1 ring-brand-accent/30 dark:bg-slate-800"
              }`}
            >
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-red-600"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-brand dark:text-white">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{n.body}</p>}
                <p className="mt-1 text-xs text-steel">{ago(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}