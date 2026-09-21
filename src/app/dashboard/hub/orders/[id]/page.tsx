"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useHubApi } from "@/lib/hub/useHubApi";
import { formatNaira, HUB_ORDER_STATUS_LABELS, type HubOrderStatus } from "@/lib/hub/config";
import type { HubOrderDTO } from "@/lib/hub/types";

const STEPS: HubOrderStatus[] = ["paid", "preparing", "out_for_delivery", "delivered"];

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const reference = useSearchParams().get("reference");
  const router = useRouter();
  const api = useHubApi();
  const { clear } = useCart();

  const [order, setOrder] = useState<HubOrderDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const verified = useRef(false);

  const load = useCallback(async () => {
    try {
      // Coming back from Paystack: confirm the payment on the server first.
      if (reference && !verified.current) {
        verified.current = true;
        try {
          const v = await api<{ paid: boolean }>(`/api/hub/paystack/verify?reference=${encodeURIComponent(reference)}`);
          if (v.paid) clear();
        } catch {
          /* the webhook may still confirm it; fall through and show the order */
        }
        router.replace(`/dashboard/hub/orders/${id}`);
      }
      const d = await api<{ order: HubOrderDTO }>(`/api/hub/orders/${id}`);
      setOrder(d.order);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    }
  }, [api, id, reference, clear, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the status fresh while the order is in progress
  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "cancelled") return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [order, load]);

  async function payNow() {
    setPaying(true);
    try {
      const r = await api<{ authorizationUrl: string }>(`/api/hub/orders/${id}/pay`, { method: "POST" });
      window.location.href = r.authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
      setPaying(false);
    }
  }

  const stepIndex = order ? STEPS.indexOf(order.status) : -1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/hub/orders"
          aria-label="Back to orders"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Order status</h1>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{error}</p>}
      {!order && !error && <p className="text-sm text-slate-500">Loading…</p>}

      {order && (
        <>
          {order.status === "pending_payment" ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {order.payment.status === "failed" ? "Your payment didn’t go through." : "This order hasn’t been paid for yet."}
              </p>
              <button
                onClick={payNow}
                disabled={paying}
                className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {paying ? "Redirecting…" : `Pay ${formatNaira(order.totalKobo)}`}
              </button>
            </div>
          ) : order.status === "cancelled" ? (
            <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              This order was cancelled.
            </p>
          ) : (
            <ol className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              {STEPS.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        done ? "bg-brand text-white" : "bg-slate-200 text-slate-400 dark:bg-slate-800"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={`text-sm ${done ? "font-semibold text-slate-900 dark:text-white" : "text-slate-400"}`}>
                      {HUB_ORDER_STATUS_LABELS[s]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">{order.vendorName}</p>
            {order.items.map((i) => (
              <div key={i.productId} className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>
                  {i.quantity} × {i.name}
                </span>
                <span>{formatNaira(i.unitPriceKobo * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <span>Delivery fee</span>
              <span>{formatNaira(order.deliveryFeeKobo)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Total</span>
              <span>{formatNaira(order.totalKobo)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <p className="text-xs uppercase tracking-wide text-slate-400">Delivering to</p>
            <p className="mt-1">{order.delivery.address}</p>
            {order.delivery.phone && <p>{order.delivery.phone}</p>}
          </div>
        </>
      )}
    </div>
  );
}
