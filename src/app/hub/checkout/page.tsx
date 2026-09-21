"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHubApi } from "@/lib/hub/useHubApi";
import { formatNaira } from "@/lib/hub/config";

export default function CheckoutPage() {
  const router = useRouter();
  const { client } = useAuth();
  const { items, hydrated, vendorName, subtotalKobo, deliveryFeeKobo, totalKobo } = useCart();
  const api = useHubApi();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (client?.phone && !phone) setPhone(client.phone);
  }, [client, phone]);

  useEffect(() => {
    if (hydrated && items.length === 0) router.replace("/dashboard/hub/cart");
  }, [hydrated, items.length, router]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ authorizationUrl: string }>("/api/hub/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          delivery: { address, phone, note },
        }),
      });
      // Paystack checkout (card, bank transfer, USSD…). It returns to /dashboard/hub/orders/[id]
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setSubmitting(false);
    }
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-900 dark:text-white";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/hub/cart"
          aria-label="Back to cart"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Checkout</h1>
      </div>

      <form onSubmit={pay} className="space-y-3">
        <textarea
          required
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery address"
          className={field}
        />
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number for the rider"
          className={field}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note for the rider (optional)"
          maxLength={300}
          className={field}
        />

        <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Order from {vendorName}</p>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Subtotal</span>
            <span>{formatNaira(subtotalKobo)}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Delivery fee</span>
            <span>{formatNaira(deliveryFeeKobo)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900 dark:border-slate-800 dark:text-white">
            <span>Total</span>
            <span>{formatNaira(totalKobo)}</span>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting || items.length === 0}
          className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Redirecting to Paystack…" : `Pay ${formatNaira(totalKobo)}`}
        </button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Secure payment by Paystack. Card, bank transfer or USSD.
        </p>
      </form>
    </div>
  );
}
