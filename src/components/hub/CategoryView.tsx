"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import ProductCard from "@/components/hub/ProductCard";
import { HUB_CATEGORIES, HUB_CATEGORY_LABELS, type HubCategory } from "@/lib/hub/config";
import { HUB_CATEGORY_META } from "@/lib/hub/categoryMeta";
import { formatVendorMeta } from "@/lib/hub/format";
import type { HubProduct, HubVendorDTO } from "@/lib/hub/types";

const pillBase = "shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold";
const pillOn = "bg-sunshine text-brand";
const pillOff = "bg-white text-steel shadow-card";

/** One shared screen for Food, Groceries, Drinks and Marketplace. It only ever requests its own category. */
export default function CategoryView({ category }: { category: HubCategory }) {
  const meta = HUB_CATEGORY_META[category];
  const label = HUB_CATEGORY_LABELS[category];

  const [vendors, setVendors] = useState<HubVendorDTO[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [products, setProducts] = useState<HubProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Preselect a vendor when arriving from the Hub (?vendor=ID)
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("vendor");
    if (v) setVendorId(v);
    setReady(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    fetch(`/api/hub/vendors?category=${category}`)
      .then((r) => r.json())
      .then((d) => setVendors(d.vendors ?? []))
      .catch(() => setVendors([]));
  }, [category]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ category });
    if (vendorId) params.set("vendorId", vendorId);
    if (debounced) params.set("q", debounced);

    fetch(`/api/hub/products?${params}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        if (!cancelled) setProducts(d.products ?? []);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [category, vendorId, debounced, ready]);

  const selectedVendor = vendors.find((v) => v._id === vendorId);
  const isGrid = meta.layout === "grid";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">{label}</h1>
      </div>

      {/* switch between categories */}
      <div className="-mt-2 flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
        {HUB_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/dashboard/hub/${c}`}
            replace
            className={`${pillBase} ${c === category ? pillOn : pillOff}`}
          >
            {HUB_CATEGORY_META[c].emoji} {HUB_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card">
        <Search className="h-4 w-4 text-steel" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={meta.searchHint}
          className="w-full bg-transparent text-sm text-brand outline-none placeholder:text-steel"
        />
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-sunshine p-5">
        <div>
          <p className="text-base font-extrabold text-brand">{meta.title}</p>
          <p className="mt-1 text-xs font-medium text-brand/70">{meta.subtitle}</p>
        </div>
        <span className="text-4xl" aria-hidden>
          {meta.emoji}
        </span>
      </div>

      {vendors.length > 1 && (
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
          <button type="button" onClick={() => setVendorId(null)} className={`${pillBase} ${!vendorId ? pillOn : pillOff}`}>
            All
          </button>
          {vendors.map((v) => (
            <button
              key={v._id}
              type="button"
              onClick={() => setVendorId(v._id)}
              className={`${pillBase} ${vendorId === v._id ? pillOn : pillOff}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {selectedVendor && (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-3xl">
            {selectedVendor.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedVendor.logoUrl} alt={selectedVendor.name} className="h-full w-full object-cover" />
            ) : (
              (selectedVendor.emoji ?? meta.emoji)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand">{selectedVendor.name}</p>
            {(selectedVendor.tagline || selectedVendor.description) && (
              <p className="truncate text-xs text-steel">{selectedVendor.tagline ?? selectedVendor.description}</p>
            )}
            <p className="mt-1 text-xs text-steel">{formatVendorMeta(selectedVendor)}</p>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-brand">{selectedVendor ? "Menu" : meta.sectionTitle}</p>
          {!loading && !error && <span className="text-xs text-steel">{products.length} items</span>}
        </div>

        {loading ? (
          <div className={isGrid ? "grid grid-cols-2 gap-3" : "space-y-3"}>
            {[0, 1, 2, 3].slice(0, isGrid ? 4 : 3).map((i) => (
              <div
                key={i}
                className={`animate-pulse rounded-2xl bg-white shadow-card ${isGrid ? "h-[208px]" : "h-[88px]"}`}
              />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-2xl bg-white p-4 text-center text-xs text-red-500 shadow-card">{error}</p>
        ) : products.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-xs text-steel shadow-card">
            {debounced ? `Nothing matches “${debounced}”.` : `No ${label.toLowerCase()} available yet.`}
          </p>
        ) : (
          <div className={isGrid ? "grid grid-cols-2 gap-3" : "space-y-3"}>
            {products.map((p) => (
              <ProductCard key={p._id} product={p} layout={meta.layout} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
