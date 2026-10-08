"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Search, X } from "lucide-react";
import { collection, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { SkeletonList } from "@/components/ui/Skeleton";
import ReviewsSheet from "@/components/ReviewsSheet";

type Company = {
  _id: string;
  businessName: string;
  logoUrl?: string;
  trades: string[];
  areas: string[];
  description?: string;
  priceRange: "low" | "mid" | "high";
  rating: number;
  ratingCount: number;
  verified: boolean;
  isOnline: boolean;
  yearsOperating: number;
};

type ChatLink = { id: string; unread: number; lastAt: number };

const PRICE_LABEL: Record<string, string> = {
  low: "\u20A6 Budget",
  mid: "\u20A6\u20A6 Mid-range",
  high: "\u20A6\u20A6\u20A6 Premium",
};

// Trades are stored as codes. This makes them readable.
function prettyTrade(t: string): string {
  const s = t.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const inputClasses =
  "block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

const selectClasses =
  "min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-brand-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function TechniciansPage() {
  const router = useRouter();
  const { user, getIdToken } = useAuth();
  const tokenRef = useRef(getIdToken);
  tokenRef.current = getIdToken;

  // Filters
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [trade, setTrade] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [online, setOnline] = useState(false);
  const [sort, setSort] = useState("best");

  // Results
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [facets, setFacets] = useState<{ trades: string[]; areas: string[] }>({ trades: [], areas: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Existing chats, keyed by company
  const [chatsByCompany, setChatsByCompany] = useState<Record<string, ChatLink>>({});

  // Reviews sheet
  const [reviewsFor, setReviewsFor] = useState<Company | null>(null);

  // Request form
  const [selected, setSelected] = useState<Company | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formArea, setFormArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Live list of this client's open chats, so the page can link straight back to them.
  useEffect(() => {
    if (!user) return;
    const qy = query(collection(db, "conversations"), where("participantUids", "array-contains", user.uid));
    return onSnapshot(
      qy,
      (snap) => {
        const map: Record<string, ChatLink> = {};
        for (const d of snap.docs) {
          const x = d.data();
          if (x.clientUid !== user.uid || x.status === "closed") continue;
          const lastAt = (x.lastMessageAt as Timestamp | null)?.toMillis?.() ?? 0;
          const unread = Number(x.unreadClient ?? 0);
          const key = String(x.companyId);
          const prev = map[key];
          if (!prev || lastAt > prev.lastAt) {
            map[key] = { id: d.id, unread: (prev?.unread ?? 0) + unread, lastAt };
          } else {
            prev.unread += unread;
          }
        }
        setChatsByCompany(map);
      },
      () => {}
    );
  }, [user]);

  const totalUnread = useMemo(
    () => Object.values(chatsByCompany).reduce((n, c) => n + c.unread, 0),
    [chatsByCompany]
  );

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedQ) params.set("q", debouncedQ);
        if (trade) params.set("trade", trade);
        if (area) params.set("area", area);
        if (price) params.set("price", price);
        if (online) params.set("online", "1");
        if (sort !== "best") params.set("sort", sort);

        const res = await authedFetch(tokenRef.current, `/api/companies?${params.toString()}`);
        const data = await res.json().catch(() => null);
        if (id !== requestId.current) return; // a newer search started
        if (!res.ok) throw new Error(data?.error || "Couldn't load companies.");
        setCompanies(data.companies ?? []);
        if (data.facets) setFacets(data.facets);
        setLoadError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setLoadError(err instanceof Error ? err.message : "Couldn't load companies.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    })();
  }, [debouncedQ, trade, area, price, online, sort]);

  const hasFilters = !!(q || trade || area || price || online || sort !== "best");

  function clearFilters() {
    setQ("");
    setDebouncedQ("");
    setTrade("");
    setArea("");
    setPrice("");
    setOnline(false);
    setSort("best");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authedFetch(tokenRef.current, "/api/chat/start", {
        method: "POST",
        body: JSON.stringify({ companyId: selected._id, title, description, area: formArea }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start the chat. Try again.");
      router.push(`/dashboard/chats/${data.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the chat. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => {
            setSelected(null);
            setError(null);
          }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-lg font-bold text-brand dark:text-white">Request {selected.businessName}</h1>
          <p className="mt-1 text-sm text-steel">
            Tell them what you need. A chat opens right away, and they will send you a quote there.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              What do you need?
            </label>
            <input
              className={inputClasses}
              maxLength={80}
              placeholder="e.g. Fix kitchen sink leak"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Details</label>
            <textarea
              className={inputClasses}
              rows={4}
              maxLength={600}
              placeholder="Describe the problem so they can give you a fair quote."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Area / address
            </label>
            <input
              className={inputClasses}
              maxLength={200}
              placeholder="e.g. 12 Adeola Street, Ikeja"
              value={formArea}
              onChange={(e) => setFormArea(e.target.value)}
            />
          </div>
          <p className="text-xs text-steel">
            Don't include phone numbers, emails or links. Everything stays in Crafteey chat.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-50"
          >
            {submitting ? "Starting chat..." : "Send request"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand dark:text-white">Technicians</h1>
          <p className="text-sm text-steel">Find a trusted company and chat with them about your job.</p>
        </div>
        <Link
          href="/dashboard/chats"
          className="relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-light"
        >
          <MessageCircle className="h-4 w-4" />
          Chats
          {totalUnread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-bold text-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by company or service"
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
        <button
          onClick={() => setOnline((v) => !v)}
          aria-pressed={online}
          className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold ${
            online
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          }`}
        >
          Online now
        </button>
        <select aria-label="Service" value={trade} onChange={(e) => setTrade(e.target.value)} className={selectClasses}>
          <option value="">All services</option>
          {facets.trades.map((t) => (
            <option key={t} value={t}>
              {prettyTrade(t)}
            </option>
          ))}
        </select>
        <select aria-label="Area" value={area} onChange={(e) => setArea(e.target.value)} className={selectClasses}>
          <option value="">All areas</option>
          {facets.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select aria-label="Price" value={price} onChange={(e) => setPrice(e.target.value)} className={selectClasses}>
          <option value="">Any price</option>
          <option value="low">{PRICE_LABEL.low}</option>
          <option value="mid">{PRICE_LABEL.mid}</option>
          <option value="high">{PRICE_LABEL.high}</option>
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className={selectClasses}>
          <option value="best">Best match</option>
          <option value="rating">Top rated</option>
          <option value="experience">Most experienced</option>
        </select>
      </div>

      {hasFilters && (
        <div className="flex items-center justify-between text-xs text-steel">
          <span>{companies ? `${companies.length} ${companies.length === 1 ? "company" : "companies"} found` : ""}</span>
          <button onClick={clearFilters} className="font-semibold text-brand-accent">
            Clear filters
          </button>
        </div>
      )}

      {loadError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {!companies && !loadError && <SkeletonList count={3} />}

      {companies && companies.length === 0 && !loadError && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-brand">No companies found</p>
          <p className="mt-1 text-sm text-steel">
            {hasFilters ? "Try a different search or clear the filters." : "No companies are available yet."}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm font-semibold text-brand-accent underline underline-offset-2">
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className={`space-y-3 transition-opacity ${loading && companies ? "opacity-60" : ""}`}>
        {companies?.map((c) => {
          const chat = chatsByCompany[c._id];
          return (
            <div key={c._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
              <div className="flex items-start gap-3">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-contain"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sunshine/30 text-lg font-bold text-brand"
                  >
                    {c.businessName.trim().charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand">
                    {c.businessName}
                    {c.verified && <span className="ml-2 text-xs font-semibold text-emerald-600">Verified</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-steel">
                    <span
                      aria-hidden="true"
                      className={`inline-block h-2 w-2 rounded-full ${c.isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                    <span>{c.isOnline ? "Online" : "Offline"}</span>
                    <span>{"\u00B7"}</span>
                    {c.ratingCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setReviewsFor(c)}
                        aria-label={`See ${c.ratingCount} ${c.ratingCount === 1 ? "review" : "reviews"} for ${c.businessName}`}
                        className="-my-2 py-2 font-semibold text-brand underline underline-offset-2"
                      >
                        {`\u2605 ${c.rating.toFixed(1)} (${c.ratingCount})`}
                      </button>
                    ) : (
                      <span>New</span>
                    )}
                    <span>{"\u00B7"}</span>
                    <span>{PRICE_LABEL[c.priceRange] ?? ""}</span>
                  </p>
                  <p className="mt-1 text-xs text-steel">{c.trades.map(prettyTrade).join(", ")}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {c.areas.slice(0, 4).join(", ")} {"\u00B7"} {c.yearsOperating}y experience
                  </p>
                </div>
              </div>
              {c.description && <p className="mt-3 line-clamp-2 text-sm text-steel">{c.description}</p>}
              <Link href={`/dashboard/technicians/${c._id}`} className="mt-2 inline-block text-sm font-semibold text-brand-accent underline underline-offset-2">
                View profile
              </Link>

              {chat ? (
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/dashboard/chats/${chat.id}`}
                    className="relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 text-sm font-bold text-white transition hover:bg-brand-accentDark"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open chat
                    {chat.unread > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-brand-accent">
                        {chat.unread}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => setSelected(c)}
                    className="min-h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-brand"
                  >
                    New request
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelected(c)}
                  className="mt-3 w-full rounded-xl bg-sunshine px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-sunshine-light"
                >
                  Request this company
                </button>
              )}
            </div>
          );
        })}
      </div>

      {reviewsFor && (
        <ReviewsSheet
          companyId={reviewsFor._id}
          companyName={reviewsFor.businessName}
          rating={reviewsFor.rating}
          ratingCount={reviewsFor.ratingCount}
          onClose={() => setReviewsFor(null)}
        />
      )}
    </div>
  );
}