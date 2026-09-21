"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useHubApi } from "@/lib/hub/useHubApi";
import { formatNaira, HUB_ORDER_STATUS_LABELS } from "@/lib/hub/config";
import type { HubOrderDTO } from "@/lib/hub/types";

export default function HubOrdersPage() {
  const api = useHubApi();
  const [orders, setOrders] = useState<HubOrderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: HubOrderDTO[] }>("/api/hub/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, [api]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/hub"
          aria-label="Back to Hub"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Hub orders</h1>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !orders ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o._id}
              href={`/dashboard/hub/orders/${o._id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.vendorName}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {HUB_ORDER_STATUS_LABELS[o.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {o.items.reduce((s, i) => s + i.quantity, 0)} items · {formatNaira(o.totalKobo)} ·{" "}
                {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
