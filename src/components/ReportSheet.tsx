"use client";

import { useState } from "react";

const REASONS = [
  { value: "contact_outside", label: "Asked me to talk or pay outside Crafteey" },
  { value: "abusive", label: "Rude or abusive" },
  { value: "scam", label: "Looks like a scam" },
  { value: "unsafe", label: "I feel unsafe" },
  { value: "other", label: "Something else" },
];

type Props = {
  onClose: () => void;
  /** Returns an error message, or null when the report was sent. */
  onSubmit: (reason: string, details: string) => Promise<string | null>;
};

export default function ReportSheet({ onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason || sending) return;
    setSending(true);
    setError(null);
    const err = await onSubmit(reason, details.trim());
    setSending(false);
    if (err) setError(err);
    else setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/50" role="dialog" aria-modal="true" aria-label="Report this chat">
      <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] dark:bg-slate-900">
        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-lg font-bold text-brand dark:text-white">Report sent</p>
            <p className="text-sm text-steel">Our team will review this chat. Thank you for helping keep Crafteey safe.</p>
            <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-brand-accent px-5 font-semibold text-white">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-lg font-bold text-brand dark:text-white">Report this chat</p>
              <p className="mt-1 text-sm text-steel">What went wrong? Our team will read the chat.</p>
            </div>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  className={`flex min-h-12 w-full items-center rounded-xl border px-4 py-3 text-left text-sm ${
                    reason === r.value
                      ? "border-brand-accent bg-brand-accent/10 font-semibold text-brand dark:text-white"
                      : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={reason === "other" ? "Tell us what happened" : "Add details (optional)"}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-12 flex-1 rounded-xl border border-slate-200 px-5 font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!reason || sending}
                className="min-h-12 flex-1 rounded-xl bg-brand-accent px-5 font-semibold text-white disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send report"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}