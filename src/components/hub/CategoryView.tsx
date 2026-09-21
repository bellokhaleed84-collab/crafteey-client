"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import ProductCard from "@/components/hub/ProductCard";
import { HUB_CATEGORY_LABELS, type HubCategory } from "@/lib/hub/config";
import type { HubProduct, HubVendorDTO } from "@/lib/hub/types";

/** One shared screen for Food, Groceries, Drinks and Marketplace. It only ever requests its own category. */
export default function CategoryView({ category }: { category: HubCategory }) {
  const { count } = useCart();
  const [vendors, setVendors] = useState<HubVendorDTO[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [products, setProducts] = useState<HubProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = HUB_CATEGORY_LABELS[category];

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/hub"
            aria-label="Back to Hub"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{label}</h1>
        </div>
        <Link
          href="/dashboard/hub/cart"
          aria-label="Cart"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <ShoppingCart className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
              {count}
            </span>
          )}
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}`}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {vendors.length > 1 && (
        <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
          {[{ _id: "", name: "All" } as Pick<HubVendorDTO, "_id" | "name">, ...vendors].map((v) => {
            const active = (vendorId ?? "") === v._id;
            return (
              <button
                key={v._id || "all"}
                onClick={() => setVendorId(v._id || null)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{error}</p>
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          {debounced ? `No results for “${debounced}”.` : `No ${label.toLowerCase()} available yet.`}
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
