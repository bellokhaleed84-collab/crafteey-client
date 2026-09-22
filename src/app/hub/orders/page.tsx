"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useHubApi } from "@/lib/hub/useHubApi";
import { formatNaira, HUB_ORDER_STATUS_LABELS, type HubOrderStatus } from "@/lib/hub/config";
import type { HubOrderDTO } from "@/lib/hub/types";
import { SkeletonList } from "@/components/ui/Skeleton";

const STATUS_EMOJI: Record<HubOrderStatus, string> = {
  pending_payment: "⏳",
  paid: "✅",
  preparing: "👨‍🍳",
  out_for_delivery: "🛵",
  delivered: "🎉",
  cancelled: "❌",
};

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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">My Orders</h1>
      </div>

      {error ? (
        <p className="rounded-2xl bg-white p-4 text-center text-xs text-red-500 shadow-card">{error}</p>
      ) : !orders ? (
        <SkeletonList count={3} />
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-5xl">🧾</p>
          <p className="mt-3 text-sm font-bold text-brand">No orders yet</p>
          <Link
            href="/dashboard/hub"
            className="mt-4 inline-block rounded-xl bg-sunshine px-5 py-2.5 text-xs font-bold text-brand"
          >
            Browse the Hub
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o._id}
              href={`/dashboard/hub/orders/${o._id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-2xl">
                {STATUS_EMOJI[o.status]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-brand">{o.vendorName}</p>
                  <span className="shrink-0 rounded-lg bg-sunshine/30 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {HUB_ORDER_STATUS_LABELS[o.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-steel">
                  {o.items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
                  {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p className="mt-0.5 text-xs font-bold text-brand-accent">{formatNaira(o.totalKobo)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}