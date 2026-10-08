"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Heart,
  SlidersHorizontal,
  UtensilsCrossed,
  ShoppingBasket,
  CupSoda,
  Store,
  X,
} from "lucide-react";
import { formatNaira } from "@/lib/hub/config";
import type { HubProduct, HubVendorDTO } from "@/lib/hub/types";
import BannerCarousel from "@/components/home/BannerCarousel";

// White card in light mode, black card with a thin outline in dark mode.
const CARD = "bg-white shadow-card dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-slate-800";

const QUICK_CATEGORIES = [
  { label: "Food", href: "/dashboard/hub/food", icon: UtensilsCrossed, tone: "bg-sunshine/20 text-sunshine-dark" },
  {
    label: "Groceries",
    href: "/dashboard/hub/groceries",
    icon: ShoppingBasket,
    tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  { label: "Drinks", href: "/dashboard/hub/drinks", icon: CupSoda, tone: "bg-brand-accent/10 text-brand-accent" },
  {
    label: "Marketplace",
    href: "/dashboard/hub/marketplace",
    icon: Store,
    tone: "bg-brand/10 text-brand dark:bg-white/10 dark:text-white",
  },
];

const FILTER_TABS = ["All", "Local", "Fast Food", "Drinks", "Desserts"];

type VendorRow = HubVendorDTO & { distanceKm?: number | null };

type Filters = { openNow: boolean; nearMe: boolean; topRated: boolean; fast: boolean };
const NO_FILTERS: Filters = { openNow: false, nearMe: false, topRated: false, fast: false };

const FILTER_ROWS: { key: keyof Filters; label: string; sub: string }[] = [
  { key: "openNow", label: "Open now", sub: "Only shops that are open right now" },
  { key: "nearMe", label: "Near me", sub: "Closest first (uses your location)" },
  { key: "topRated", label: "Top rated", sub: "4.0 stars and above" },
  { key: "fast", label: "Fast delivery", sub: "Under 30 minutes" },
];

function formatReviews(n?: number) {
  if (!n) return "";
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${n}+`;
}

function formatMeta(r: VendorRow) {
  const parts: string[] = [];
  if (r.rating) parts.push(`\u2B50 ${r.rating}${r.reviewCount ? ` (${formatReviews(r.reviewCount)})` : ""}`);
  if (r.etaMin && r.etaMax) parts.push(`${r.etaMin}-${r.etaMax} mins`);
  if (typeof r.distanceKm === "number") parts.push(`${r.distanceKm} km away`);
  if (!r.isOpen) parts.push("Closed");
  return parts.join(" \u00B7 ");
}

// Asks the phone where it is. Rejects if the person says no or it takes too long.
function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      reject(new Error("no geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// Shown when there are no Hub banners switched on in the admin.
function DefaultHubBanner() {
  return (
    <div className="rounded-2xl bg-sunshine p-5">
      <p className="text-base font-extrabold text-brand">Good Food, Great Mood</p>
      <p className="mt-1 text-xs font-medium text-brand/70">Fresh meals, fast delivery</p>
    </div>
  );
}

function FilterSheet({
  initial,
  busy,
  onApply,
  onClose,
}: {
  initial: Filters;
  busy: boolean;
  onApply: (f: Filters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(initial);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // z-[60] so the sheet sits above the bottom nav (z-50).
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter shops"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-slate-900"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <p className="text-lg font-extrabold text-brand dark:text-white">Filter</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-brand dark:bg-slate-800 dark:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 pb-4">
          {FILTER_ROWS.map((row) => {
            const on = draft[row.key];
            return (
              <button
                key={row.key}
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => setDraft((d) => ({ ...d, [row.key]: !d[row.key] }))}
                className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border p-3 text-left ${
                  on ? "border-brand-accent bg-brand-accent/10" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-brand dark:text-white">{row.label}</span>
                  <span className="block text-xs text-steel">{row.sub}</span>
                </span>
                <span
                  className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${
                    on ? "bg-brand-accent" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <span
                    className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      on ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800">
          <button
            type="button"
            onClick={() => setDraft(NO_FILTERS)}
            disabled={busy}
            className="h-12 rounded-xl border border-slate-200 px-5 text-sm font-bold text-steel disabled:opacity-50 dark:border-slate-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            disabled={busy}
            className="h-12 flex-1 rounded-xl bg-sunshine text-sm font-extrabold text-brand disabled:opacity-60"
          >
            {busy ? "Finding your location\u2026" : "Show results"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HubPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [restaurants, setRestaurants] = useState<VendorRow[] | null>(null);
  const [picks, setPicks] = useState<HubProduct[] | null>(null);

  // Filter sheet
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeCount = Object.values(filters).filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Restaurants: refetch when the search or any filter changes.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ category: "food" });
    if (debounced) params.set("q", debounced);
    if (filters.openNow) params.set("openOnly", "true");
    if (filters.topRated) params.set("minRating", "4");
    if (filters.fast) params.set("maxEta", "30");
    if (filters.nearMe && coords) {
      params.set("lat", String(coords.lat));
      params.set("lng", String(coords.lng));
      params.set("sort", "nearest");
    }

    fetch(`/api/hub/vendors?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setRestaurants(d.vendors ?? []))
      .catch(() => !cancelled && setRestaurants([]));

    return () => {
      cancelled = true;
    };
  }, [debounced, filters, coords]);

  // Marketplace picks only follow the search.
  useEffect(() => {
    let cancelled = false;
    const q = debounced ? `&q=${encodeURIComponent(debounced)}` : "";

    fetch(`/api/hub/products?category=marketplace&limit=3${q}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setPicks(d.products ?? []))
      .catch(() => !cancelled && setPicks([]));

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  async function applyFilters(next: Filters) {
    setNotice(null);
    let final = next;
    if (next.nearMe && !coords) {
      setLocating(true);
      try {
        setCoords(await getPosition());
      } catch {
        final = { ...next, nearMe: false };
        setNotice("Couldn't get your location. Allow location for this app and try Near me again.");
      } finally {
        setLocating(false);
      }
    }
    setFilters(final);
    setFilterOpen(false);
  }

  const visibleRestaurants = (restaurants ?? []).filter(
    (r) =>
      activeCategory === "All" ||
      (r.filterTags ?? []).some((t) => t.toLowerCase() === activeCategory.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-brand dark:text-white">Crafteey Hub</h1>
      <p className="-mt-4 text-xs text-steel">{"\uD83D\uDCCD"} Lagos, Nigeria</p>

      <div className="flex items-center gap-2">
        <div className={`flex flex-1 items-center gap-2 rounded-2xl px-4 py-3 ${CARD}`}>
          <Search className="h-4 w-4 text-steel" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={"Search for restaurants, groceries, products\u2026"}
            className="w-full bg-transparent text-sm text-brand outline-none placeholder:text-steel dark:text-white"
          />
        </div>
        <button
          type="button"
          aria-label="Filter"
          onClick={() => setFilterOpen(true)}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sunshine text-brand"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {notice && (
        <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {notice}
        </p>
      )}

      {/* Category shortcuts - each opens its own page and shows only that category */}
      <div className="grid grid-cols-4 gap-2.5">
        {QUICK_CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              href={c.href}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 ${CARD}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-center text-[11px] font-semibold leading-tight text-brand dark:text-white">{c.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Hub banners - managed from the admin Banners page (Show on: Hub or Both) */}
      <BannerCarousel placement="hub" fallback={<DefaultHubBanner />} />

      <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
        {FILTER_TABS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
              activeCategory === cat ? "bg-sunshine text-brand" : `text-steel ${CARD}`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-brand dark:text-white">Popular Restaurants</p>
          <Link href="/dashboard/hub/food" className="text-xs font-semibold text-brand-accent">
            See all
          </Link>
        </div>

        {activeCount > 0 && (
          <div className="mb-3 flex items-center justify-between text-xs text-steel">
            <span>
              {restaurants
                ? `${visibleRestaurants.length} ${visibleRestaurants.length === 1 ? "shop" : "shops"} found`
                : ""}
            </span>
            <button
              type="button"
              onClick={() => setFilters(NO_FILTERS)}
              className="font-semibold text-brand-accent"
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="space-y-3">
          {restaurants === null ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-white shadow-card dark:bg-slate-800 dark:shadow-none" />
            ))
          ) : visibleRestaurants.length === 0 ? (
            <p className={`rounded-2xl p-4 text-center text-xs text-steel ${CARD}`}>
              {debounced
                ? `No restaurants match \u201C${debounced}\u201D.`
                : activeCount > 0
                ? "No shops match your filters."
                : "No restaurants here yet."}
            </p>
          ) : (
            visibleRestaurants.map((r) => (
              <Link
                key={r._id}
                href={`/dashboard/hub/vendors/${r._id}`}
                className={`flex items-center gap-3 rounded-2xl p-3 ${CARD}`}
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-3xl dark:bg-slate-800">
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logoUrl} alt={r.name} className="h-full w-full object-cover" />
                  ) : (
                    (r.emoji ?? "\uD83C\uDF7D\uFE0F")
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-bold text-brand dark:text-white">{r.name}</p>
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
          <p className="text-sm font-bold text-brand dark:text-white">Marketplace picks</p>
          <Link href="/dashboard/hub/marketplace" className="text-xs font-semibold text-brand-accent">
            See all
          </Link>
        </div>
        {picks === null ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-white shadow-card dark:bg-slate-800 dark:shadow-none" />
            ))}
          </div>
        ) : picks.length === 0 ? (
          <p className={`rounded-2xl p-4 text-center text-xs text-steel ${CARD}`}>
            {debounced ? `No products match \u201C${debounced}\u201D.` : "No marketplace items yet."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {picks.map((p) => (
              <Link key={p._id} href="/dashboard/hub/marketplace" className={`rounded-2xl p-3 ${CARD}`}>
                <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-2xl dark:bg-slate-800">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    (p.emoji ?? "\uD83D\uDECD\uFE0F")
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-tight text-brand dark:text-white">{p.name}</p>
                <p className="mt-1 text-xs font-bold text-brand-accent">{formatNaira(p.priceKobo)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterSheet
          initial={filters}
          busy={locating}
          onApply={(f) => void applyFilters(f)}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}