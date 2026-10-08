"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

type Props = {
  title: string;
  subtitle?: string;
  /** Longest comment allowed. Companies allow 500, shops 300. */
  maxLength?: number;
  onClose: () => void;
  /** Returns an error message, or null when the review was saved. */
  onSubmit: (rating: number, comment: string) => Promise<string | null>;
};

export default function RatingSheet({ title, subtitle, maxLength = 500, onClose, onSubmit }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!rating || sending) return;
    setSending(true);
    setError(null);
    const err = await onSubmit(rating, comment.trim());
    setSending(false);
    if (err) setError(err);
    else setDone(true);
  }

  return (
    // z-[60] so the sheet sits above the bottom nav (z-50).
    <div className="fixed inset-0 z-[60] flex items-end bg-black/50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:bg-slate-900">
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white">Thank you!</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your review helps other customers choose well.</p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 w-full rounded-xl bg-brand-accent px-5 font-semibold text-white"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{title}</p>
              {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>

            <div className="text-center">
              <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setRating(n)}
                    className="flex h-12 w-12 items-center justify-center"
                  >
                    <Star
                      className={`h-9 w-9 ${
                        n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-1 h-5 text-sm font-semibold text-slate-700 dark:text-slate-300">{LABELS[rating]}</p>
            </div>

            <textarea
              rows={3}
              maxLength={maxLength}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others what it was like (optional)"
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-accent dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 flex-1 rounded-xl border border-slate-200 px-5 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!rating || sending}
                className="min-h-12 flex-1 rounded-xl bg-brand-accent px-5 font-semibold text-white disabled:opacity-60"
              >
                {sending ? "Sending..." : "Submit review"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}