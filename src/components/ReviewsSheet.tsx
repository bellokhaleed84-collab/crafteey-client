"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { Skeleton } from "@/components/ui/Skeleton";

type ReviewItem = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type Props = {
  companyId: string;
  companyName: string;
  rating: number;
  ratingCount: number;
  onClose: () => void;
};

function day(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Africa/Lagos" }).format(new Date(iso));
}

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
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

function ReviewSkeleton() {
  return (
    <div className="space-y-2 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export default function ReviewsSheet({ companyId, companyName, rating, ratingCount, onClose }: Props) {
  const { getIdToken } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (before: string | null) => {
      const qs = before ? `?before=${encodeURIComponent(before)}` : "";
      const res = await authedFetch(getIdToken, `/api/companies/${companyId}/reviews${qs}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Couldn't load reviews.");
      return data as { reviews: ReviewItem[]; nextBefore: string | null };
    },
    [companyId, getIdToken]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPage(null);
        if (cancelled) return;
        setReviews(data.reviews);
        setNextBefore(data.nextBefore);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Couldn't load reviews.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(nextBefore);
      setReviews((prev) => [...(prev ?? []), ...data.reviews]);
      setNextBefore(data.nextBefore);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load more reviews.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={`Reviews for ${companyName}`}
      onClick={onClose}
    >
      <div
        className="flex max-h-[85dvh] w-full flex-col rounded-t-2xl bg-white dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">{companyName}</p>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={rating} size="h-5 w-5" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {rating.toFixed(1)} ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5">
          {error && !reviews && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          {!reviews && !error && (
            <>
              <ReviewSkeleton />
              <ReviewSkeleton />
              <ReviewSkeleton />
            </>
          )}

          {reviews && reviews.length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No reviews yet.</p>
          )}

          {reviews?.map((r) => (
            <div key={r.id} className="space-y-1.5 rounded-xl border border-slate-100 p-3 dark:border-slate-700">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.name}</p>
                <p className="text-xs text-slate-400">{day(r.createdAt)}</p>
              </div>
              <Stars value={r.rating} />
              {r.comment && (
                <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
                  {r.comment}
                </p>
              )}
            </div>
          ))}

          {reviews && error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}

          {nextBefore && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="min-h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}