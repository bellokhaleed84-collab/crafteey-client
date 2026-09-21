"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";

export default function CartPage() {
  const { items, hydrated, vendorName, subtotalKobo, deliveryFeeKobo, totalKobo, setQuantity, removeItem, clear } =
    useCart();

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
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Your cart</h1>
      </div>

      {!hydrated ? null : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Your cart is empty.</p>
          <Link href="/dashboard/hub" className="mt-3 inline-block text-sm font-semibold text-brand dark:text-white">
            Browse the Hub
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ordering from <span className="font-semibold text-slate-900 dark:text-white">{vendorName}</span>
          </p>

          <div className="space-y-3">
            {items.map((i) => (
              <div
                key={i.productId}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{i.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatNaira(i.priceKobo)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(i.productId, i.quantity - 1)}
                    aria-label="Decrease quantity"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{i.quantity}</span>
                  <button
                    onClick={() => setQuantity(i.productId, i.quantity + 1)}
                    aria-label="Increase quantity"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(i.productId)}
                  aria-label={`Remove ${i.name}`}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <Row label="Subtotal" value={formatNaira(subtotalKobo)} />
            <Row label="Delivery fee" value={formatNaira(deliveryFeeKobo)} />
            <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
              <Row label="Total" value={formatNaira(totalKobo)} bold />
            </div>
          </div>

          <Link
            href="/dashboard/hub/checkout"
            className="block rounded-2xl bg-brand py-3 text-center text-sm font-semibold text-white"
          >
            Checkout
          </Link>
          <button onClick={clear} className="w-full text-center text-xs text-slate-500 underline dark:text-slate-400">
            Clear cart
          </button>
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
