"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useHubApi } from "@/lib/hub/useHubApi";
import type { HubOrderDTO } from "@/lib/hub/types";
import type { HubOrderStatus } from "@/lib/hub/config";

// Orders in these states still have something worth tracking. Excludes
// pending_payment (nothing to track yet) and delivered/cancelled (done).
const ACTIVE_STATUSES: HubOrderStatus[] = ["paid", "preparing", "out_for_delivery"];

const STATUS_TEXT: Record<string, string> = {
  paid: "Order placed — waiting on the vendor",
  preparing: "Being prepared",
  out_for_delivery: "On the way to you",
};

const STATUS_EMOJI: Record<string, string> = {
  paid: "✅",
  preparing: "👨‍🍳",
  out_for_delivery: "🛵",
};

export default function ActiveHubOrderBanner() {
  const api = useHubApi();
  const [activeOrder, setActiveOrder] = useState<HubOrderDTO | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const d = await api<{ orders: HubOrderDTO[] }>("/api/hub/orders");
        if (cancelled) return;
        const active = d.orders
          .filter((o) => ACTIVE_STATUSES.includes(o.status))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        setActiveOrder(active ?? null);
      } catch {
        // silent — this is a convenience banner, not critical data
      }
    }

    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [api]);

  if (!activeOrder) return null;

  return (
    <Link
      href={`/dashboard/hub/orders/${activeOrder._id}`}
      className="flex items-center gap-3 rounded-2xl bg-brand px-4 py-3.5 text-white shadow-card-lg"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">
        {STATUS_EMOJI[activeOrder.status] ?? "📦"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{activeOrder.vendorName}</p>
        <p className="mt-0.5 text-xs text-white/80">
          {STATUS_TEXT[activeOrder.status] ?? "Tracking your order"}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />
    </Link>
  );
}