"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";

export default function CartPage() {
  const { items, hydrated, vendorName, subtotalKobo, deliveryFeeKobo, totalKobo, setQuantity, removeItem, clear } =
    useCart();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-brand">Your Cart</h1>
        </div>
        <Link href="/dashboard/hub/orders" className="text-xs font-semibold text-brand-accent">
          My orders
        </Link>
      </div>

      {!hydrated ? (
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-5xl">🛒</p>
          <p className="mt-3 text-sm font-bold text-brand">Your cart is empty</p>
          <p className="mt-1 text-xs text-steel">Add something tasty from the Hub.</p>
          <Link
            href="/dashboard/hub"
            className="mt-4 inline-block rounded-xl bg-sunshine px-5 py-2.5 text-xs font-bold text-brand"
          >
            Browse the Hub
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-sunshine p-5">
            <p className="text-xs font-medium text-brand/70">Ordering from</p>
            <p className="text-base font-extrabold text-brand">{vendorName}</p>
          </div>

          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.productId} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-2xl">
                  {i.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.imageUrl} alt={i.name} className="h-full w-full object-cover" />
                  ) : (
                    (i.emoji ?? "🛍️")
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand">{i.name}</p>
                  <p className="text-xs font-bold text-brand-accent">{formatNaira(i.priceKobo * i.quantity)}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuantity(i.productId, i.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-brand"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-brand">{i.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(i.productId, i.quantity + 1)}
                      aria-label="Increase quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunshine text-brand"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i.productId)}
                  aria-label={`Remove ${i.name}`}
                  className="self-start p-1 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-2xl bg-white p-4 text-sm shadow-card">
            <div className="flex justify-between text-steel">
              <span>Subtotal</span>
              <span className="font-semibold text-brand">{formatNaira(subtotalKobo)}</span>
            </div>
            <div className="flex justify-between text-steel">
              <span>Delivery fee</span>
              <span className="font-semibold text-brand">{formatNaira(deliveryFeeKobo)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-brand">
              <span>Total</span>
              <span>{formatNaira(totalKobo)}</span>
            </div>
          </div>

          <div className="sticky bottom-20 z-20">
            <Link
              href="/dashboard/hub/checkout"
              className="flex items-center justify-between rounded-2xl bg-sunshine px-5 py-3.5 text-brand shadow-card"
            >
              <span className="text-sm font-extrabold">Go to checkout</span>
              <span className="text-sm font-extrabold">{formatNaira(totalKobo)}</span>
            </Link>
          </div>

          <button type="button" onClick={clear} className="w-full text-center text-xs font-semibold text-steel underline">
            Clear cart
          </button>
        </>
      )}
    </div>
  );
}
