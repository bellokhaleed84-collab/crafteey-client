"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Heart, SlidersHorizontal, UtensilsCrossed, ShoppingBasket, CupSoda, Store } from "lucide-react";
import { formatNaira } from "@/lib/hub/config";
import type { HubProduct, HubVendorDTO } from "@/lib/hub/types";

const QUICK_CATEGORIES = [
  { label: "Food", href: "/dashboard/hub/food", icon: UtensilsCrossed, tone: "bg-sunshine/20 text-sunshine-dark" },
  { label: "Groceries", href: "/dashboard/hub/groceries", icon: ShoppingBasket, tone: "bg-emerald-100 text-emerald-700" },
  { label: "Drinks", href: "/dashboard/hub/drinks", icon: CupSoda, tone: "bg-brand-accent/10 text-brand-accent" },
  { label: "Marketplace", href: "/dashboard/hub/marketplace", icon: Store, tone: "bg-brand/10 text-brand" },
];

const FILTER_TABS = ["All", "Local", "Fast Food", "Drinks", "Desserts"];

function formatReviews(n?: number) {
  if (!n) return "";
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${n}+`;
}

function formatMeta(r: HubVendorDTO) {
  const parts: string[] = [];
  if (r.rating) parts.push(`⭐ ${r.rating}${r.reviewCount ? ` (${formatReviews(r.reviewCount)})` : ""}`);
  if (r.etaMin && r.etaMax) parts.push(`${r.etaMin}-${r.etaMax} mins`);
  if (!r.isOpen) parts.push("Closed");
  return parts.join(" · ");
}

export default function HubPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [restaurants, setRestaurants] = useState<HubVendorDTO[] | null>(null);
  const [picks, setPicks] = useState<HubProduct[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const q = debounced ? `&q=${encodeURIComponent(debounced)}` : "";

    fetch(`/api/hub/vendors?category=food${q}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setRestaurants(d.vendors ?? []))
      .catch(() => !cancelled && setRestaurants([]));

    fetch(`/api/hub/products?category=marketplace&limit=3${q}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setPicks(d.products ?? []))
      .catch(() => !cancelled && setPicks([]));

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const visibleRestaurants = (restaurants ?? []).filter(
    (r) =>
      activeCategory === "All" ||
      (r.filterTags ?? []).some((t) => t.toLowerCase() === activeCategory.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Crafteey Hub</h1>
      </div>
      <p className="-mt-4 text-xs text-steel">📍 Lagos, Nigeria</p>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card">
          <Search className="h-4 w-4 text-steel" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for restaurants, groceries, products…"
            className="w-full bg-transparent text-sm text-brand outline-none placeholder:text-steel"
          />
        </div>
        <button
          type="button"
          aria-label="Filter"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sunshine text-brand"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Category shortcuts — each opens its own page and shows only that category */}
      <div className="grid grid-cols-4 gap-2.5">
        {QUICK_CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-card"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-center text-[11px] font-semibold leading-tight text-brand">{c.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl bg-sunshine p-5">
        <p className="text-base font-extrabold text-brand">Good Food, Great Mood</p>
        <p className="mt-1 text-xs font-medium text-brand/70">Fresh meals, fast delivery</p>
      </div>

      <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
        {FILTER_TABS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
              activeCategory === cat ? "bg-sunshine text-brand" : "bg-white text-steel shadow-card"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-brand">Popular Restaurants</p>
          <Link href="/dashboard/hub/food" className="text-xs font-semibold text-brand-accent">
            See all
          </Link>
        </div>
        <div className="space-y-3">
          {restaurants === null ? (
            [0, 1, 2].map((i) => <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-white shadow-card" />)
          ) : visibleRestaurants.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-center text-xs text-steel shadow-card">
              {debounced ? `No restaurants match “${debounced}”.` : "No restaurants here yet."}
            </p>
          ) : (
            visibleRestaurants.map((r) => (
              <Link
                key={r._id}
                href={`/dashboard/hub/food?vendor=${r._id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-3xl">
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logoUrl} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    (r.emoji ?? "🍽️")
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-bold text-brand">{r.name}</p>
                    <Heart className="h-4 w-4 shrink-0 text-red-400" />
                  </div>
                  {r.tagline && <p className="text-xs text-steel">{r.tagline}</p>}
                  <p className="mt-1 text-xs text-steel">{formatMeta(r)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-brand">Marketplace picks</p>
          <Link href="/dashboard/hub/marketplace" className="text-xs font-semibold text-brand-accent">
            See all
          </Link>
        </div>
        {picks === null ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-white shadow-card" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-center text-xs text-steel shadow-card">
            {debounced ? `No products match “${debounced}”.` : "No marketplace items yet."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {picks.map((p) => (
              <Link key={p._id} href="/dashboard/hub/marketplace" className="rounded-2xl bg-white p-3 shadow-card">
                <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-2xl">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    (p.emoji ?? "🛍️")
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-brand">{p.name}</p>
                <p className="mt-1 text-xs font-bold text-brand-accent">{formatNaira(p.priceKobo)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
