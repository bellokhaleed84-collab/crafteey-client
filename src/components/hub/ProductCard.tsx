"use client";

import { Minus, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";
import type { HubProduct } from "@/lib/hub/types";

export default function ProductCard({ product, layout }: { product: HubProduct; layout: "list" | "grid" }) {
  const { addItem, replaceWith, setQuantity, quantityOf } = useCart();
  const qty = quantityOf(product._id);
  const orderable = product.isAvailable && product.vendor.isOpen;

  const line = {
    productId: product._id,
    name: product.name,
    priceKobo: product.priceKobo,
    imageUrl: product.imageUrl,
    emoji: product.emoji,
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

  const control = !orderable ? (
    <span className="text-[11px] font-semibold text-steel">{product.vendor.isOpen ? "Sold out" : "Closed"}</span>
  ) : qty === 0 ? (
    <button
      type="button"
      onClick={handleAdd}
      className="rounded-xl bg-sunshine px-3.5 py-1.5 text-xs font-bold text-brand active:scale-95"
    >
      Add
    </button>
  ) : (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setQuantity(product._id, qty - 1)}
        aria-label="Decrease quantity"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-brand"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-4 text-center text-xs font-bold text-brand">{qty}</span>
      <button
        type="button"
        onClick={() => setQuantity(product._id, qty + 1)}
        aria-label="Increase quantity"
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunshine text-brand"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const picture = product.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
  ) : (
    (product.emoji ?? "🛍️")
  );

  if (layout === "list") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-3xl">
          {picture}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-brand">{product.name}</p>
          <p className="truncate text-xs text-steel">
            {product.vendor.name}
            {product.unit ? ` · ${product.unit}` : ""}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-brand-accent">{formatNaira(product.priceKobo)}</span>
            {control}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl bg-white p-3 shadow-card">
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-4xl">
        {picture}
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2rem] text-xs font-semibold leading-tight text-brand">{product.name}</p>
      <p className="mt-0.5 truncate text-[11px] text-steel">{product.unit ?? product.vendor.name}</p>
      <div className="mt-2 flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-brand-accent">{formatNaira(product.priceKobo)}</span>
        {control}
      </div>
    </div>
  );
}
