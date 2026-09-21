"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHubApi } from "@/lib/hub/useHubApi";
import { usePaystackPopup } from "@/lib/hub/usePaystackPopup";
import { formatNaira } from "@/lib/hub/config";

type Stage = "idle" | "creating" | "paying";

const input =
  "w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-brand outline-none placeholder:text-steel";

export default function CheckoutPage() {
  const router = useRouter();
  const { client } = useAuth();
  const { items, hydrated, vendorName, subtotalKobo, deliveryFeeKobo, totalKobo, clear } = useCart();
  const api = useHubApi();
  const openPaystack = usePaystackPopup();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // an order that was created but not paid yet (customer closed the payment window)
  const [pending, setPending] = useState<{ orderId: string; sig: string } | null>(null);

  useEffect(() => {
    if (client?.phone && !phone) setPhone(client.phone);
  }, [client, phone]);

  useEffect(() => {
    if (hydrated && items.length === 0 && !done) router.replace("/dashboard/hub/cart");
  }, [hydrated, items.length, done, router]);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (stage !== "idle") return;
    setError(null);
    setStage("creating");

    try {
      // Same cart + details as a saved unpaid order? Reuse it instead of making a duplicate.
      const sig = JSON.stringify({
        i: items.map((i) => [i.productId, i.quantity]),
        a: address.trim(),
        p: phone.trim(),
        n: note.trim(),
      });

      let orderId: string;
      let accessCode: string;

      if (pending && pending.sig === sig) {
        const r = await api<{ accessCode: string }>(`/api/hub/orders/${pending.orderId}/pay`, { method: "POST" });
        orderId = pending.orderId;
        accessCode = r.accessCode;
      } else {
        const r = await api<{ orderId: string; accessCode: string }>("/api/hub/orders", {
          method: "POST",
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            delivery: { address, phone, note },
          }),
        });
        orderId = r.orderId;
        accessCode = r.accessCode;
        setPending({ orderId, sig });
      }

      setStage("paying");
      await openPaystack(accessCode, {
        onSuccess: (reference) => {
          // The order page confirms the payment with the server before showing it as paid.
          setDone(true);
          clear();
          router.push(`/dashboard/hub/orders/${orderId}?reference=${encodeURIComponent(reference)}`);
        },
        onCancel: () => {
          setStage("idle");
          setError("Payment not completed. Your order is saved — tap Pay to try again.");
        },
        onError: (message) => {
          setStage("idle");
          setError(message);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setStage("idle");
    }
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={pay} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub/cart" aria-label="Back to cart" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Checkout</h1>
      </div>

      {/* delivery details */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">📍 Delivery details</p>
        <textarea
          required
          rows={3}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery address"
          className={`${input} resize-none`}
        />
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number for the rider"
          className={input}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Note for the rider (optional)"
          className={input}
        />
      </div>

      {/* order summary */}
      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-brand">🧾 Your order</p>
          <span className="text-xs text-steel">{vendorName}</span>
        </div>
        {items.map((i) => (
          <div key={i.productId} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-brand">
              {i.quantity} × {i.name}
            </span>
            <span className="shrink-0 font-semibold text-brand">{formatNaira(i.priceKobo * i.quantity)}</span>
          </div>
        ))}
        <div className="space-y-1.5 border-t border-slate-100 pt-2 text-sm">
          <div className="flex justify-between text-steel">
            <span>Subtotal</span>
            <span className="font-semibold text-brand">{formatNaira(subtotalKobo)}</span>
          </div>
          <div className="flex justify-between text-steel">
            <span>Delivery fee</span>
            <span className="font-semibold text-brand">{formatNaira(deliveryFeeKobo)}</span>
          </div>
          <div className="flex justify-between font-bold text-brand">
            <span>Total</span>
            <span>{formatNaira(totalKobo)}</span>
          </div>
        </div>
      </div>

      {/* payment */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">💳 Payment</p>
        <p className="text-xs text-steel">
          Pay right here without leaving the app. Pick your method after tapping Pay.
        </p>
        <div className="flex flex-wrap gap-2">
          {["💳 Card", "🏦 Bank transfer", "📲 USSD"].map((m) => (
            <span key={m} className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-brand">
              {m}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-steel">🔒 Secured by Paystack</p>
      </div>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">{error}</p>}

      {/* pay button stays in view at the bottom */}
      <div className="sticky bottom-20 z-20">
        <button
          type="submit"
          disabled={busy || items.length === 0}
          className="flex w-full items-center justify-between rounded-2xl bg-sunshine px-5 py-3.5 text-brand shadow-card disabled:opacity-60"
        >
          <span className="text-sm font-extrabold">
            {stage === "creating" ? "Preparing payment…" : stage === "paying" ? "Waiting for payment…" : "Pay now"}
          </span>
          <span className="text-sm font-extrabold">{formatNaira(totalKobo)}</span>
        </button>
      </div>
    </form>
  );
}
