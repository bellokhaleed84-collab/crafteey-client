"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Clock, MapPin, Star, Users, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { Skeleton } from "@/components/ui/Skeleton";

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
  technicianCount: number;
  photos: string[];
  createdAt: string;
};

type ReviewItem = { id: string; name: string; rating: number; comment: string; createdAt: string };

const PRICE_LABEL: Record<string, string> = {
  low: "\u20A6 Budget",
  mid: "\u20A6\u20A6 Mid-range",
  high: "\u20A6\u20A6\u20A6 Premium",
};

function prettyTrade(t: string): string {
  const s = t.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function day(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(iso));
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${
            n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
          }`}
        />
      ))}
    </span>
  );
}

const CARD =
  "rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";
const LABEL = "text-[11px] font-semibold uppercase tracking-wide text-steel";
const inputClasses =
  "block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function CompanyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getIdToken } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [distribution, setDistribution] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [photoOpen, setPhotoOpen] = useState<string | null>(null);

  const [requesting, setRequesting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(getIdToken, `/api/companies/${id}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Couldn't load this company.");
        if (cancelled) return;
        setCompany(data.company);
        setDistribution(data.distribution ?? {});
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load this company.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getIdToken]);

  const fetchReviews = useCallback(
    async (before: string | null) => {
      const qs = before ? `?before=${encodeURIComponent(before)}` : "";
      const res = await authedFetch(getIdToken, `/api/companies/${id}/reviews${qs}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Couldn't load reviews.");
      return data as { reviews: ReviewItem[]; nextBefore: string | null };
    },
    [id, getIdToken]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReviews(null);
        if (cancelled) return;
        setReviews(data.reviews);
        setNextBefore(data.nextBefore);
      } catch (e) {
        if (cancelled) return;
        setReviewError(e instanceof Error ? e.message : "Couldn't load reviews.");
        setReviews([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchReviews]);

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchReviews(nextBefore);
      setReviews((prev) => [...(prev ?? []), ...data.reviews]);
      setNextBefore(data.nextBefore);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Couldn't load more reviews.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await authedFetch(getIdToken, "/api/chat/start", {
        method: "POST",
        body: JSON.stringify({ companyId: company._id, title, description, area }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start the chat. Try again.");
      router.push(`/dashboard/chats/${data.conversationId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't start the chat. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const back = (
    <Link href="/dashboard/technicians" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent">
      <ArrowLeft className="h-4 w-4" /> Back to technicians
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {back}
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-4">
        {back}
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const maxBar = Math.max(1, ...Object.values(distribution));
  const memberSince = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(
    new Date(company.createdAt)
  );

  return (
    <div className="space-y-5 pb-4">
      {back}

      {/* Header */}
      <div className={`${CARD} space-y-4`}>
        <div className="flex items-start gap-3">
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-contain dark:border-slate-700"
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-sunshine/30 text-2xl font-bold text-brand"
            >
              {company.businessName.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold text-brand dark:text-white">{company.businessName}</h1>
            {company.verified && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <BadgeCheck className="h-4 w-4" /> Verified company
              </span>
            )}
            <p className="mt-1 flex items-center gap-1.5 text-xs text-steel">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${company.isOnline ? "bg-emerald-500" : "bg-slate-300"}`}
              />
              {company.isOnline ? "Online now" : "Offline"}
              <span>{"\u00B7"}</span>
              {PRICE_LABEL[company.priceRange] ?? ""}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {company.ratingCount > 0 ? (
                <>
                  <Stars value={company.rating} />
                  <span className="text-sm font-bold text-brand dark:text-white">{company.rating.toFixed(1)}</span>
                  <span className="text-xs text-steel">
                    ({company.ratingCount} {company.ratingCount === 1 ? "review" : "reviews"})
                  </span>
                </>
              ) : (
                <span className="text-xs font-semibold text-steel">New on Crafteey, no reviews yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface-muted p-2.5 dark:bg-slate-800">
            <Clock className="mx-auto h-4 w-4 text-brand-accent" />
            <p className="mt-1 text-sm font-bold text-brand dark:text-white">{company.yearsOperating}y</p>
            <p className="text-[10px] text-steel">Experience</p>
          </div>
          <div className="rounded-xl bg-surface-muted p-2.5 dark:bg-slate-800">
            <Users className="mx-auto h-4 w-4 text-brand-accent" />
            <p className="mt-1 text-sm font-bold text-brand dark:text-white">{company.technicianCount}</p>
            <p className="text-[10px] text-steel">{company.technicianCount === 1 ? "Technician" : "Technicians"}</p>
          </div>
          <div className="rounded-xl bg-surface-muted p-2.5 dark:bg-slate-800">
            <Star className="mx-auto h-4 w-4 text-brand-accent" />
            <p className="mt-1 text-sm font-bold text-brand dark:text-white">{memberSince}</p>
            <p className="text-[10px] text-steel">Joined</p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className={CARD}>
        <p className="mb-2 text-sm font-bold text-brand dark:text-white">About</p>
        {company.description ? (
          <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
            {company.description}
          </p>
        ) : (
          <p className="text-sm text-steel">This company hasn&apos;t added a description yet.</p>
        )}

        {company.trades.length > 0 && (
          <div className="mt-4">
            <p className={LABEL}>Services</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {company.trades.map((t) => (
                <span key={t} className="rounded-full bg-sunshine/30 px-2.5 py-1 text-xs font-semibold text-brand">
                  {prettyTrade(t)}
                </span>
              ))}
            </div>
          </div>
        )}

        {company.areas.length > 0 && (
          <div className="mt-4">
            <p className={LABEL}>Areas covered</p>
            <p className="mt-1.5 flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
              {company.areas.join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Work photos */}
      {company.photos.length > 0 && (
        <div className={CARD}>
          <p className="mb-3 text-sm font-bold text-brand dark:text-white">Photos of their work</p>
          <div className="grid grid-cols-3 gap-2">
            {company.photos.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setPhotoOpen(url)}
                aria-label="View photo"
                className="aspect-square overflow-hidden rounded-xl bg-surface-muted active:scale-95 dark:bg-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className={`${CARD} space-y-4`}>
        <p className="text-sm font-bold text-brand dark:text-white">Reviews</p>

        {company.ratingCount > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-brand dark:text-white">{company.rating.toFixed(1)}</p>
              <Stars value={company.rating} />
              <p className="mt-1 text-xs text-steel">
                {company.ratingCount} {company.ratingCount === 1 ? "review" : "reviews"}
              </p>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = distribution[String(n)] ?? 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs text-steel">
                    <span className="w-3 text-right">{n}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {reviews === null && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        )}

        {reviews && reviews.length === 0 && !reviewError && (
          <p className="py-4 text-center text-sm text-steel">No reviews yet. Be the first after your job.</p>
        )}

        {reviewError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {reviewError}
          </p>
        )}

        {reviews?.map((r) => (
          <div key={r.id} className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-brand dark:text-white">{r.name}</p>
              <p className="text-xs text-slate-400">{day(r.createdAt)}</p>
            </div>
            <Stars value={r.rating} />
            {r.comment && (
              <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
            )}
          </div>
        ))}

        {nextBefore && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="min-h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
          >
            {loadingMore ? "Loading..." : "Load more reviews"}
          </button>
        )}
      </div>

      {/* Request */}
      {!requesting ? (
        <button
          type="button"
          onClick={() => setRequesting(true)}
          className="w-full rounded-xl bg-sunshine px-4 py-3 text-sm font-bold text-brand transition hover:bg-sunshine-light"
        >
          Request this company
        </button>
      ) : (
        <form onSubmit={submit} className={`${CARD} space-y-4`}>
          <div>
            <p className="text-sm font-bold text-brand dark:text-white">Request {company.businessName}</p>
            <p className="mt-1 text-xs text-steel">
              Tell them what you need. A chat opens right away, and they will send you a quote there.
            </p>
          </div>
          {formError && (
            <p role="alert" className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">What do you need?</label>
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
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Area / address</label>
            <input
              className={inputClasses}
              maxLength={200}
              placeholder="e.g. 12 Adeola Street, Ikeja"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <p className="text-xs text-steel">
            Don&apos;t include phone numbers, emails or links. Everything stays in Crafteey chat.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setRequesting(false);
                setFormError(null);
              }}
              className="min-h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-11 flex-1 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-50"
            >
              {submitting ? "Starting chat..." : "Send request"}
            </button>
          </div>
        </form>
      )}

      {/* Photo viewer */}
      {photoOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          onClick={() => setPhotoOpen(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPhotoOpen(null)}
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoOpen} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}