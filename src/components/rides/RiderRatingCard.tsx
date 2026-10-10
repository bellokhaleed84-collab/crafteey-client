"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { Skeleton } from "@/components/ui/Skeleton";
import RatingSheet from "@/components/RatingSheet";

type Info = {
  riderName: string | null;
  canRate: boolean;
  review: { rating: number; comment: string } | null;
};

const CARD =
  "rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-5 w-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}`}
        />
      ))}
    </span>
  );
}

// Shows "Rate your rider" for a delivered request, or the rating already given.
export default function RiderRatingCard({
  requestId,
  riderName,
  onDismiss,
}: {
  requestId: string;
  riderName?: string | null;
  onDismiss?: () => void;
}) {
  const { getIdToken } = useAuth();
  const [info, setInfo] = useState<Info | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authedFetch(getIdToken, `/api/courier-requests/${requestId}/rate`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error("load failed");
      setInfo(data as Info);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [requestId, getIdToken]);

  useEffect(() => {
    setInfo(null);
    setFailed(false);
    void load();
  }, [load]);

  async function submit(rating: number, comment: string): Promise<string | null> {
    try {
      const res = await authedFetch(getIdToken, `/api/courier-requests/${requestId}/rate`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) void load();
        return data.error || "Couldn't send your rating. Try again.";
      }
      void load();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Couldn't send your rating. Try again.";
    }
  }

  if (failed && !info) return null;
  if (!info) return <Skeleton className="h-24 w-full rounded-2xl" />;
  if (!info.canRate) return null;

  const name = info.riderName || riderName || "your rider";

  if (info.review) {
    return (
      <div className={`${CARD} space-y-2`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-steel">Your rating for {name}</p>
        <Stars value={info.review.rating} />
        {info.review.comment && (
          <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
            {info.review.comment}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={`${CARD} space-y-3`}>
        <div>
          <p className="text-sm font-bold text-brand dark:text-white">How was {name}?</p>
          <p className="mt-0.5 text-xs text-steel">Your rating helps keep Crafteey riders great.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-12 w-full rounded-xl bg-sunshine px-5 text-sm font-extrabold text-brand active:scale-[0.98]"
        >
          Rate {name}
        </button>
        {onDismiss && (
          <button type="button" onClick={onDismiss} className="w-full py-1 text-center text-xs font-semibold text-steel">
            Not now
          </button>
        )}
      </div>

      {open && (
        <RatingSheet
          title={`Rate ${name}`}
          subtitle="How was your delivery?"
          maxLength={300}
          onClose={() => setOpen(false)}
          onSubmit={submit}
        />
      )}
    </>
  );
}