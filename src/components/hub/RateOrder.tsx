"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useHubApi } from "@/lib/hub/useHubApi";

export default function RateOrder({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const api = useHubApi();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (rating < 1 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/hub/orders/${orderId}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send your rating");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
      <p className="text-sm font-bold text-brand">How was your order?</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
            <Star className={`h-8 w-8 ${n <= rating ? "fill-sunshine text-sunshine" : "text-slate-300"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="Tell others about it (optional)"
        className="w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-brand outline-none placeholder:text-steel"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={rating < 1 || busy}
        className="w-full rounded-xl bg-sunshine py-3 text-sm font-extrabold text-brand disabled:opacity-60"
      >
        {busy ? "Sending…" : "Submit rating"}
      </button>
    </div>
  );
}