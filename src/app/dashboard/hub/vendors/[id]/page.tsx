"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Minus, Plus, Star, Bike, ShoppingBag } from "lucide-react";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";

interface VendorDTO {
  _id: string;
  name: string;
  logoUrl: string | null;
  emoji: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  rating: number | null;
  reviewCount: number;
  etaMin: number | null;
  etaMax: number | null;
}

interface ProductDTO {
  _id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  imageUrl: string | null;
  emoji: string | null;
  unit: string | null;
  category: string;
  available: boolean;
}

type CartInput = Omit<CartItem, "quantity">;

// "08:00" -> "8:00 AM"
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return t;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function VendorPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem, replaceWith, setQuantity, quantityOf, count, subtotalKobo, hydrated } = useCart();

  const [vendor, setVendor] = useState<VendorDTO | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ item: CartInput; currentVendorName: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/hub/vendors/${id}`)
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error || "Couldn't load this vendor");
        return d as { vendor: VendorDTO; products: ProductDTO[] };
      })
      .then((d) => {
        if (cancelled) return;
        setVendor(d.vendor);
        setProducts(d.products);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load this vendor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProductDTO[]>();
    products.forEach((p) => map.set(p.category, [...(map.get(p.category) ?? []), p]));
    return Array.from(map.entries());
  }, [products]);

  function add(p: ProductDTO) {
    if (!vendor) return;
    const item: CartInput = {
      productId: p._id,
      name: p.name,
      priceKobo: p.priceKobo,
      imageUrl: p.imageUrl ?? undefined,
      emoji: p.emoji ?? undefined,
      vendorId: vendor._id,
      vendorName: vendor.name,
    };
    const r = addItem(item);
    if (r.ok === false) setConflict({ item, currentVendorName: r.currentVendorName });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-white shadow-card" />
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-card" />
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-card" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">{error ?? "Vendor not found"}</p>
      </div>
    );
  }

  const open = fmtTime(vendor.openTime);
  const close = fmtTime(vendor.closeTime);

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="rounded-3xl bg-sunshine px-5 pb-5 pt-4">
        <Link
          href="/dashboard/hub"
          aria-label="Back to Hub"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-brand"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-4xl shadow-card">
            {vendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.logoUrl} alt={`${vendor.name} logo`} className="h-full w-full object-cover" />
            ) : (
              (vendor.emoji ?? "🍽️")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold leading-tight text-brand">{vendor.name}</h1>
            {vendor.tagline && <p className="mt-0.5 text-xs font-medium text-brand/70">{vendor.tagline}</p>}
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                vendor.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}
            >
              {vendor.isOpen ? "Open now" : "Closed"}
            </span>
          </div>
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-2 text-xs font-semibold text-brand">
        <span className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 shadow-card">
          <Star className="h-3.5 w-3.5 fill-sunshine text-sunshine" />
          {vendor.rating ? `${vendor.rating.toFixed(1)} (${vendor.reviewCount})` : "New"}
        </span>
        {vendor.etaMin && vendor.etaMax && (
          <span className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 shadow-card">
            <Bike className="h-3.5 w-3.5 text-brand-accent" />
            {vendor.etaMin}-{vendor.etaMax} mins
          </span>
        )}
        {open && close && (
          <span className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 shadow-card">
            <Clock className="h-3.5 w-3.5 text-brand-accent" />
            {open} – {close}
          </span>
        )}
        {vendor.address && (
          <span className="flex min-w-0 items-center gap-1 rounded-xl bg-white px-3 py-1.5 shadow-card">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-accent" />
            <span className="truncate">{vendor.address}</span>
          </span>
        )}
      </div>

      {vendor.description && <p className="text-sm text-steel">{vendor.description}</p>}

      {!vendor.isOpen && (
        <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">
          {vendor.name} is closed right now{open ? `. They open at ${open}` : ""}. You can browse the menu, but
          ordering is available once they reopen.
        </p>
      )}

      {/* Other-vendor cart prompt */}
      {conflict && (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">Start a new cart?</p>
          <p>
            Your cart has items from {conflict.currentVendorName}. You can only order from one place at a time.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                replaceWith(conflict.item);
                setConflict(null);
              }}
              className="flex-1 rounded-xl bg-sunshine py-2 font-bold text-brand"
            >
              Start new cart
            </button>
            <button
              type="button"
              onClick={() => setConflict(null)}
              className="flex-1 rounded-xl bg-white py-2 font-bold text-steel"
            >
              Keep my cart
            </button>
          </div>
        </div>
      )}

      {/* Menu */}
      {products.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-steel shadow-card">
          This vendor hasn&apos;t added any items yet.
        </p>
      ) : (
        grouped.map(([cat, items]) => (
          <div key={cat} className="space-y-2">
            {grouped.length > 1 && <p className="text-sm font-bold text-brand">{cap(cat)}</p>}
            {grouped.length === 1 && <p className="text-sm font-bold text-brand">Menu</p>}
            <div className="space-y-2">
              {items.map((p) => {
                const qty = hydrated ? quantityOf(p._id) : 0;
                const canOrder = p.available && vendor.isOpen;
                return (
                  <div key={p._id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-3xl">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        (p.emoji ?? "🍽️")
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-brand">{p.name}</p>
                      {p.description && <p className="line-clamp-2 text-xs text-steel">{p.description}</p>}
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-extrabold text-brand">{formatNaira(p.priceKobo)}</span>
                          {p.unit && <span className="ml-1 text-[11px] text-steel">/ {p.unit}</span>}
                        </div>

                        {!p.available ? (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600">
                            Sold out
                          </span>
                        ) : qty > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setQuantity(p._id, qty - 1)}
                              aria-label={`Remove one ${p.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-muted text-brand"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-brand">{qty}</span>
                            <button
                              type="button"
                              onClick={() => add(p)}
                              disabled={!canOrder}
                              aria-label={`Add one more ${p.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-sunshine text-brand disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => add(p)}
                            disabled={!canOrder}
                            className="rounded-xl bg-sunshine px-4 py-1.5 text-xs font-extrabold text-brand disabled:opacity-50"
                          >
                            {vendor.isOpen ? "Add" : "Closed"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Cart bar */}
      {hydrated && count > 0 && (
        <div className="sticky bottom-20 z-20">
          <Link
            href="/dashboard/hub/cart"
            className="flex items-center justify-between rounded-2xl bg-sunshine px-5 py-3.5 text-brand shadow-card"
          >
            <span className="flex items-center gap-2 text-sm font-extrabold">
              <ShoppingBag className="h-4 w-4" />
              View cart · {count} {count === 1 ? "item" : "items"}
            </span>
            <span className="text-sm font-extrabold">{formatNaira(subtotalKobo)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}