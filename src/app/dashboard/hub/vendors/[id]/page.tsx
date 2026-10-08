"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Minus, Plus, Star, ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, type NewCartItem } from "@/contexts/CartContext";
import { authedFetch } from "@/lib/chatApi";
import { formatNaira } from "@/lib/hub/config";
import { hasOptions, priceSelection, type OptionGroup, type Selection } from "@/lib/hub/options";
import ReviewsSheet from "@/components/ReviewsSheet";
import RatingSheet from "@/components/RatingSheet";

// White card in light mode, black card with a thin outline in dark mode.
const CARD = "bg-white shadow-card dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-slate-800";
const FOOD_EMOJI = "\uD83C\uDF7D\uFE0F";
const MAX_PLATES = 50;

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
  optionGroups: OptionGroup[];
}

// "08:00" -> "8:00 AM"
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return t;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

function ChoicePic({ url, name }: { url?: string; name: string }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-xl dark:bg-slate-800">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        FOOD_EMOJI
      )}
    </span>
  );
}

function FoodSheet({
  product,
  vendorOpen,
  plainQty,
  onAddPlain,
  onMinusPlain,
  onAddConfigured,
  onClose,
}: {
  product: ProductDTO;
  vendorOpen: boolean;
  plainQty: number;
  onAddPlain: () => void;
  onMinusPlain: () => void;
  onAddConfigured: (selections: Selection[], plates: number) => void;
  onClose: () => void;
}) {
  const groups = useMemo(
    () => (product.optionGroups ?? []).filter((g) => g.choices.length > 0),
    [product.optionGroups]
  );
  const configurable = hasOptions(groups);
  const canOrder = product.available && vendorOpen;

  const [picks, setPicks] = useState<Record<string, number>>({});
  const [plates, setPlates] = useState(1);

  // Stop the page behind from scrolling, and close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const selections: Selection[] = Object.entries(picks)
    .filter(([, q]) => q > 0)
    .map(([choiceId, quantity]) => ({ choiceId, quantity }));
  const priced = priceSelection(groups, selections);
  const unitKobo = product.priceKobo + (priced.ok ? priced.extrasKobo : 0);

  function pickSingle(g: OptionGroup, choiceId: string) {
    setPicks((prev) => {
      const next = { ...prev };
      const wasPicked = (prev[choiceId] ?? 0) > 0;
      for (const c of g.choices) delete next[c.id];
      if (!(wasPicked && !g.required)) next[choiceId] = 1;
      return next;
    });
  }

  function setCount(choiceId: string, max: number, q: number) {
    setPicks((prev) => ({ ...prev, [choiceId]: Math.max(0, Math.min(q, max)) }));
  }

  return (
    // z-[60] so the sheet sits ABOVE the bottom nav (which is z-50).
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white dark:bg-slate-900"
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative">
            <div className="flex h-40 w-full items-center justify-center overflow-hidden bg-surface-muted text-6xl dark:bg-slate-800">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                (product.emoji ?? FOOD_EMOJI)
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-5 pb-4 pt-4">
            <div>
              <h2 className="text-xl font-extrabold leading-tight text-brand dark:text-white">{product.name}</h2>
              <p className="mt-1 text-lg font-extrabold text-brand dark:text-white">
                {formatNaira(product.priceKobo)}
                {product.unit && <span className="ml-1 text-xs font-medium text-steel">{"/ " + product.unit}</span>}
              </p>
            </div>

            {product.description ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-steel">{product.description}</p>
            ) : (
              <p className="text-sm text-steel">No description yet.</p>
            )}

            {configurable &&
              groups.map((g) => (
                <div key={g.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-extrabold text-brand dark:text-white">{g.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        g.required ? "bg-sunshine text-brand" : "bg-surface-muted text-steel dark:bg-slate-800"
                      }`}
                    >
                      {g.required ? "Required" : "Optional"}
                    </span>
                  </div>
                  <p className="text-[11px] text-steel">{g.single ? "Pick one" : "Add as many as you like"}</p>

                  {g.choices.map((c) => {
                    const q = picks[c.id] ?? 0;
                    const priceText = c.priceKobo > 0 ? "+" + formatNaira(c.priceKobo) : "Included";
                    if (g.single) {
                      const on = q > 0;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickSingle(g, c.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left ${
                            on
                              ? "border-brand-accent bg-brand-accent/10"
                              : "border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <ChoicePic url={c.imageUrl} name={c.name} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-brand dark:text-white">{c.name}</span>
                            <span className="block text-xs text-steel">{priceText}</span>
                          </span>
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                              on ? "border-brand-accent bg-brand-accent" : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {on && <span className="h-2 w-2 rounded-full bg-white" />}
                          </span>
                        </button>
                      );
                    }
                    const max = Math.max(1, c.maxQty);
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 rounded-2xl border p-2.5 ${
                          q > 0 ? "border-brand-accent bg-brand-accent/10" : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <ChoicePic url={c.imageUrl} name={c.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-brand dark:text-white">{c.name}</span>
                          <span className="block text-xs text-steel">
                            {priceText}
                            {c.priceKobo > 0 ? " each" : ""}
                            {max > 1 ? " \u00B7 up to " + max : ""}
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setCount(c.id, max, q - 1)}
                            disabled={q === 0}
                            aria-label={"Remove one " + c.name}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-muted text-brand disabled:opacity-40 dark:bg-slate-800 dark:text-white"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-5 text-center text-sm font-extrabold text-brand dark:text-white">{q}</span>
                          <button
                            type="button"
                            onClick={() => setCount(c.id, max, q + 1)}
                            disabled={q >= max}
                            aria-label={"Add one " + c.name}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-sunshine text-brand disabled:opacity-40"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800">
          {!product.available ? (
            <p className="rounded-2xl bg-red-50 py-3 text-center text-sm font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
              Sold out
            </p>
          ) : configurable ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlates((n) => Math.max(1, n - 1))}
                  aria-label="Fewer plates"
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-brand dark:bg-slate-800 dark:text-white"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-6 text-center text-lg font-extrabold text-brand dark:text-white">{plates}</span>
                <button
                  type="button"
                  onClick={() => setPlates((n) => Math.min(MAX_PLATES, n + 1))}
                  aria-label="More plates"
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunshine text-brand"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                disabled={!canOrder || !priced.ok}
                onClick={() => priced.ok && onAddConfigured(priced.normalized, plates)}
                className="h-12 flex-1 rounded-xl bg-sunshine px-3 text-sm font-extrabold text-brand disabled:opacity-50"
              >
                {!vendorOpen
                  ? "Closed"
                  : priced.ok
                  ? "Add " + plates + " to cart \u00B7 " + formatNaira(unitKobo * plates)
                  : priced.error}
              </button>
            </div>
          ) : plainQty > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onMinusPlain}
                  aria-label={"Remove one " + product.name}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-brand dark:bg-slate-800 dark:text-white"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <span className="w-7 text-center text-lg font-extrabold text-brand dark:text-white">{plainQty}</span>
                <button
                  type="button"
                  onClick={onAddPlain}
                  disabled={!canOrder}
                  aria-label={"Add one more " + product.name}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-sunshine text-brand disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-12 flex-1 rounded-xl bg-sunshine text-sm font-extrabold text-brand"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAddPlain}
              disabled={!canOrder}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sunshine text-sm font-extrabold text-brand disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {vendorOpen ? "Add to cart \u00B7 " + formatNaira(product.priceKobo) : "Closed"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorPage() {
  const { id } = useParams<{ id: string }>();
  const { getIdToken } = useAuth();
  const { addItem, replaceWith, setQuantity, quantityOf, count, subtotalKobo, hydrated } = useCart();

  const [vendor, setVendor] = useState<VendorDTO | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState("All");
  const [conflict, setConflict] = useState<{
    item: NewCartItem;
    quantity: number;
    currentVendorName: string;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reviews
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [rateOrderId, setRateOrderId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
        // A failed refresh (after a new review) keeps the page as it is.
        if (!cancelled && reloadKey === 0) setError(e instanceof Error ? e.message : "Couldn't load this vendor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const sections = useMemo(
    () => Array.from(new Set(products.map((p) => p.menuSection).filter((s): s is string => !!s))),
    [products]
  );
  const visible = section === "All" ? products : products.filter((p) => p.menuSection === section);
  const selected = selectedId ? products.find((p) => p._id === selectedId) ?? null : null;

  function baseItem(p: ProductDTO): NewCartItem | null {
    if (!vendor) return null;
    return {
      productId: p._id,
      name: p.name,
      priceKobo: p.priceKobo,
      imageUrl: p.imageUrl ?? undefined,
      emoji: p.emoji ?? undefined,
      vendorId: vendor._id,
      vendorName: vendor.name,
    };
  }

  // Foods without options: add one plate.
  function add(p: ProductDTO) {
    const item = baseItem(p);
    if (!item) return;
    const r = addItem(item);
    if (r.ok === false) {
      setSelectedId(null); // close the sheet so the "start a new cart?" question is visible
      setConflict({ item, quantity: 1, currentVendorName: r.currentVendorName });
    }
  }

  // Foods with options: add the plates with the picked extras.
  function addConfigured(p: ProductDTO, selections: Selection[], plates: number) {
    const base = baseItem(p);
    if (!base) return;
    const priced = priceSelection(p.optionGroups, selections);
    if (!priced.ok) return;
    const item: NewCartItem = {
      ...base,
      optionsKobo: priced.extrasKobo,
      selections: priced.normalized,
      picked: priced.picked,
    };
    const r = addItem(item, plates);
    setSelectedId(null);
    if (r.ok === false) setConflict({ item, quantity: plates, currentVendorName: r.currentVendorName });
  }

  // Sends the review for one delivered order. The server checks it is really theirs.
  async function submitVendorReview(rating: number, comment: string): Promise<string | null> {
    if (!rateOrderId) return "Order not found.";
    try {
      const res = await authedFetch(getIdToken, `/api/hub/orders/${rateOrderId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error || "Couldn't send your review. Try again.";
      setReloadKey((k) => k + 1); // refresh the stars and count
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn't send your review. Try again.";
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-white shadow-card dark:bg-slate-800 dark:shadow-none" />
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-card dark:bg-slate-800 dark:shadow-none" />
        <div className="h-24 animate-pulse rounded-2xl bg-white shadow-card dark:bg-slate-800 dark:shadow-none" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand dark:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {error ?? "Vendor not found"}
        </p>
      </div>
    );
  }

  const open = fmtTime(vendor.openTime);
  const close = fmtTime(vendor.closeTime);
  const hoursText = vendor.isOpen
    ? close
      ? `Open now \u00B7 Closes ${close}`
      : "Open now"
    : open
    ? `Closed \u00B7 Opens ${open}`
    : "Closed";

  return (
    <div className="space-y-5 pb-28">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand dark:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand dark:text-white">Crafteey Hub</h1>
      </div>

      {/* Hero card */}
      <div className="relative min-h-[10rem] overflow-hidden rounded-3xl bg-surface-muted dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className={`relative z-10 space-y-1.5 p-5 ${vendor.bannerUrl ? "w-[58%]" : ""}`}>
          <h2 className="text-xl font-extrabold leading-tight text-brand dark:text-white">{vendor.name}</h2>
          {vendor.tagline && <p className="text-xs font-medium text-steel">{vendor.tagline}</p>}

          {/* Tap the rating to read reviews (and write one if you have a delivered order) */}
          <button
            type="button"
            onClick={() => setReviewsOpen(true)}
            aria-label={`Reviews for ${vendor.name}`}
            className="-my-1 flex min-h-9 items-center gap-1.5 py-1 text-left text-sm font-bold text-brand dark:text-white"
          >
            <Star className="h-4 w-4 fill-sunshine text-sunshine" />
            {vendor.rating ? (
              <>
                {vendor.rating.toFixed(1)}
                <span className="font-medium text-steel underline underline-offset-2">
                  ({vendor.reviewCount} {vendor.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span className="font-medium text-steel underline underline-offset-2">
                {"New \u00B7 no reviews yet"}
              </span>
            )}
          </button>

          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand dark:text-white">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className={vendor.isOpen ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
              {hoursText}
            </span>
          </p>

          {vendor.address && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-brand dark:text-white">
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
        <p className="rounded-2xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {vendor.name} is closed right now. You can browse the menu, but ordering opens when they reopen.
        </p>
      )}

      {/* Other-vendor cart prompt */}
      {conflict && (
        <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="font-bold">Start a new cart?</p>
          <p>Your cart has items from {conflict.currentVendorName}. You can only order from one place at a time.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                replaceWith(conflict.item, conflict.quantity);
                setConflict(null);
              }}
              className="flex-1 rounded-xl bg-sunshine py-2 font-bold text-brand"
            >
              Start new cart
            </button>
            <button
              type="button"
              onClick={() => setConflict(null)}
              className="flex-1 rounded-xl bg-white py-2 font-bold text-steel dark:bg-slate-800"
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
                section === s ? "bg-sunshine text-brand" : "bg-surface-muted text-steel dark:bg-slate-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Menu: one column. Tap a food to see it properly. */}
      <p className="text-base font-extrabold text-brand dark:text-white">Menu</p>
      {visible.length === 0 ? (
        <p className={`rounded-2xl p-6 text-center text-sm text-steel ${CARD}`}>
          {products.length === 0 ? "This vendor hasn't added any items yet." : "Nothing in this section yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((p) => {
            const qty = hydrated ? quantityOf(p._id) : 0;
            const canOrder = p.available && vendor.isOpen;
            const configurable = hasOptions(p.optionGroups);
            const lineKey = p._id;
            return (
              <div
                key={lineKey}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(p._id)}
                onKeyDown={(e) => {
                  if (e.target === e.currentTarget && e.key === "Enter") setSelectedId(p._id);
                }}
                className={`flex cursor-pointer gap-3 rounded-2xl border border-slate-100 p-3 dark:border-transparent ${CARD}`}
              >
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-muted text-4xl dark:bg-slate-800">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    (p.emoji ?? FOOD_EMOJI)
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <p className="truncate text-sm font-bold text-brand dark:text-white">{p.name}</p>
                    {p.description && <p className="line-clamp-2 text-xs text-steel">{p.description}</p>}
                    <p className="mt-1 text-sm font-extrabold text-brand dark:text-white">
                      {formatNaira(p.priceKobo)}
                      {p.unit && <span className="ml-1 text-[11px] font-medium text-steel">{"/ " + p.unit}</span>}
                    </p>
                    {configurable && <p className="text-[11px] font-semibold text-brand-accent">Extras available</p>}
                  </div>

                  <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                    {!p.available ? (
                      <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                        Sold out
                      </span>
                    ) : configurable ? (
                      <button
                        type="button"
                        onClick={() => setSelectedId(p._id)}
                        disabled={!canOrder}
                        className="flex items-center gap-1 rounded-xl bg-sunshine px-4 py-2 text-xs font-extrabold text-brand disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {!vendor.isOpen ? "Closed" : qty > 0 ? qty + " in cart" : "Choose"}
                      </button>
                    ) : qty > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuantity(p._id, qty - 1)}
                          aria-label={`Remove one ${p.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-brand dark:bg-slate-800 dark:text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-brand dark:text-white">{qty}</span>
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
              {"View cart \u00B7 " + count + (count === 1 ? " item" : " items")}
            </span>
            <span className="text-sm font-extrabold">{formatNaira(subtotalKobo)}</span>
          </Link>
        </div>
      )}

      {/* Food detail sheet */}
      {selected && (
        <FoodSheet
          key={selected._id}
          product={selected}
          vendorOpen={vendor.isOpen}
          plainQty={hydrated ? quantityOf(selected._id) : 0}
          onAddPlain={() => add(selected)}
          onMinusPlain={() => setQuantity(selected._id, quantityOf(selected._id) - 1)}
          onAddConfigured={(selections, plates) => addConfigured(selected, selections, plates)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Reviews: read them, and write one if you have a delivered order from this shop */}
      {reviewsOpen && (
        <ReviewsSheet
          endpoint={`/api/hub/vendors/${vendor._id}/reviews`}
          companyName={vendor.name}
          rating={vendor.rating ?? 0}
          ratingCount={vendor.reviewCount}
          onClose={() => setReviewsOpen(false)}
          onWrite={(orderId) => {
            setReviewsOpen(false);
            setRateOrderId(orderId);
          }}
        />
      )}

      {rateOrderId && (
        <RatingSheet
          title={`Rate ${vendor.name}`}
          subtitle="How was your order?"
          maxLength={300}
          onClose={() => setRateOrderId(null)}
          onSubmit={submitVendorReview}
        />
      )}
    </div>
  );
}