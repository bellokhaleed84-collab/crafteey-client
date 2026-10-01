"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Minus, Plus, Star, ShoppingBag } from "lucide-react";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";

interface VendorDTO {
  _id: string;
  name: string;
  bannerUrl: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  rating: number | null;
  reviewCount: number;
}

interface ProductDTO {
  _id: string;
  name: string;
  description: string | null;
  priceKobo: number;
  imageUrl: string | null;
  emoji: string | null;
  unit: string | null;
  menuSection: string | null;
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

export default function VendorPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem, replaceWith, setQuantity, quantityOf, count, subtotalKobo, hydrated } = useCart();

  const [vendor, setVendor] = useState<VendorDTO | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState("All");
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

  const sections = useMemo(
    () => Array.from(new Set(products.map((p) => p.menuSection).filter((s): s is string => !!s))),
    [products]
  );
  const visible = section === "All" ? products : products.filter((p) => p.menuSection === section);

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
  const hoursText = vendor.isOpen
    ? close
      ? `Open now · Closes ${close}`
      : "Open now"
    : open
    ? `Closed · Opens ${open}`
    : "Closed";

  return (
    <div className="space-y-5 pb-28">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Crafteey Hub</h1>
      </div>

      {/* Hero card */}
      <div className="relative min-h-[10rem] overflow-hidden rounded-3xl bg-surface-muted">
        <div className={`relative z-10 space-y-1.5 p-5 ${vendor.bannerUrl ? "w-[58%]" : ""}`}>
          <h2 className="text-xl font-extrabold leading-tight text-brand">{vendor.name}</h2>
          {vendor.tagline && <p className="text-xs font-medium text-steel">{vendor.tagline}</p>}

          <p className="flex items-center gap-1.5 text-sm font-bold text-brand">
            <Star className="h-4 w-4 fill-sunshine text-sunshine" />
            {vendor.rating ? (
              <>
                {vendor.rating.toFixed(1)}
                <span className="font-medium text-steel">
                  ({vendor.reviewCount} {vendor.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span className="font-medium text-steel">New · no reviews yet</span>
            )}
          </p>

          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className={vendor.isOpen ? "text-green-700" : "text-red-600"}>{hoursText}</span>
          </p>

          {vendor.address && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{vendor.address}</span>
            </p>
          )}
        </div>

        {vendor.bannerUrl && (
          <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden rounded-l-[2.5rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vendor.bannerUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      {vendor.description && <p className="text-sm leading-relaxed text-steel">{vendor.description}</p>}

      {!vendor.isOpen && (
        <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700">
          {vendor.name} is closed right now. You can browse the menu, but ordering opens when they reopen.
        </p>
      )}

      {/* Other-vendor cart prompt */}
      {conflict && (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">Start a new cart?</p>
          <p>Your cart has items from {conflict.currentVendorName}. You can only order from one place at a time.</p>
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

      {/* Section chips: only once the vendor has set sections */}
      {sections.length > 0 && (
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {["All", ...sections].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className={`shrink-0 rounded-2xl px-5 py-2.5 text-xs font-bold ${
                section === s ? "bg-sunshine text-brand" : "bg-surface-muted text-steel"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Menu: one column */}
      <p className="text-base font-extrabold text-brand">Menu</p>
      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-steel shadow-card">
          {products.length === 0 ? "This vendor hasn't added any items yet." : "Nothing in this section yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => {
            const qty = hydrated ? quantityOf(p._id) : 0;
            const canOrder = p.available && vendor.isOpen;
            return (
              <div key={p._id} className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-card">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-4xl">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    (p.emoji ?? "🍽️")
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="truncate text-sm font-bold text-brand">{p.name}</p>
                    {p.description && <p className="line-clamp-2 text-xs text-steel">{p.description}</p>}
                    <p className="mt-1 text-sm font-extrabold text-brand">
                      {formatNaira(p.priceKobo)}
                      {p.unit && <span className="ml-1 text-[11px] font-medium text-steel">/ {p.unit}</span>}
                    </p>
                  </div>

                  <div className="mt-2 flex justify-end">
                    {!p.available ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600">
                        Sold out
                      </span>
                    ) : qty > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(p._id, qty - 1)}
                          aria-label={`Remove one ${p.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-brand"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-brand">{qty}</span>
                        <button
                          type="button"
                          onClick={() => add(p)}
                          disabled={!canOrder}
                          aria-label={`Add one more ${p.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-sunshine text-brand disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => add(p)}
                        disabled={!canOrder}
                        className="flex items-center gap-1 rounded-xl bg-sunshine px-4 py-2 text-xs font-extrabold text-brand disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {vendor.isOpen ? "Add" : "Closed"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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