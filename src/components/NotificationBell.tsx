"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function NotificationBell() {
  const { getIdToken } = useAuth();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/notifications?countOnly=1", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(Number(data.unreadCount ?? 0));
    } catch {
      /* keep the last known count */
    }
  }, [getIdToken]);

  // On load, on every page change, every 30s, and when the app comes back to the front.
  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 30000);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-brand hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}