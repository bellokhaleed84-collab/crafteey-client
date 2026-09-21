"use client";

import { Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";
import type { HubProduct } from "@/lib/hub/types";

export default function ProductCard({ product }: { product: HubProduct }) {
  const { addItem, replaceWith, setQuantity, quantityOf } = useCart();
  const qty = quantityOf(product._id);
  const orderable = product.isAvailable && product.vendor.isOpen;

  const line = {
    productId: product._id,
    name: product.name,
    priceKobo: product.priceKobo,
    imageUrl: product.imageUrl,
    vendorId: product.vendor._id,
    vendorName: product.vendor.name,
  };

  function handleAdd() {
    const res = addItem(line);
    if (!res.ok) {
      const ok = window.confirm(
        `Your cart has items from ${res.currentVendorName}. Clear it and start a new order from ${product.vendor.name}?`
      );
      if (ok) replaceWith(line);
    }
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">{product.emoji ?? "🛍️"}</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{product.name}</p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {product.vendor.name}
            {product.unit ? ` · ${product.unit}` : ""}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-brand dark:text-white">{formatNaira(product.priceKobo)}</span>

          {!orderable ? (
            <span className="text-xs text-slate-400">{product.vendor.isOpen ? "Sold out" : "Closed"}</span>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white active:scale-95"
            >
              Add
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(product._id, qty - 1)}
                aria-label="Decrease quantity"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQuantity(product._id, qty + 1)}
                aria-label="Increase quantity"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
