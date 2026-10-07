"use client";

import { nairaText } from "@/lib/quoteShared";

export type ClientQuote = {
  id: string;
  kind: "main" | "additional";
  reason: string | null;
  title: string;
  description: string;
  items: { label: string; amountKobo: number }[];
  totalKobo: number;
  expiresAt: string;
  status: "sent" | "paid" | "declined" | "cancelled" | "expired";
};

const CHIP: Record<ClientQuote["status"], { label: string; cls: string }> = {
  sent: { label: "Waiting for your reply", cls: "bg-amber-100 text-amber-800" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-700" },
  declined: { label: "Declined", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled by company", cls: "bg-slate-200 text-slate-700" },
  expired: { label: "Expired", cls: "bg-slate-200 text-slate-700" },
};

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  }).format(new Date(iso));
}

export default function QuoteCard({
  quote,
  busy,
  walletKobo,
  onPayCard,
  onPayWallet,
  onDecline,
}: {
  quote: ClientQuote;
  busy: boolean;
  walletKobo: number | null;
  onPayCard: (id: string) => void;
  onPayWallet: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const chip = CHIP[quote.status];
  const canWallet = walletKobo !== null && walletKobo >= quote.totalKobo;
  return (
    <div className="w-full max-w-[88%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800">
      <div className="bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
        {quote.kind === "additional" ? "Additional quotation" : "Quotation"}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="font-bold text-brand dark:text-white">{quote.title}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">
            {quote.description}
          </p>
          {quote.reason && <p className="mt-1 text-xs text-steel">Reason: {quote.reason}</p>}
        </div>

        {quote.items.length > 0 && (
          <div className="space-y-1 border-t border-slate-100 pt-2 text-sm dark:border-slate-700">
            {quote.items.map((i, n) => (
              <div key={n} className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{i.label}</span>
                <span>{nairaText(i.amountKobo)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-brand dark:border-slate-700 dark:text-white">
          <span>Total</span>
          <span>{nairaText(quote.totalKobo)}</span>
        </div>

        <p className="text-xs text-steel">
          {quote.status === "sent" ? "Expires" : "Expiry"}: {when(quote.expiresAt)}
        </p>

        {quote.status === "sent" ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onPayCard(quote.id)}
              className="min-h-11 w-full rounded-xl bg-brand-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Please wait..." : `Pay now ${nairaText(quote.totalKobo)}`}
            </button>
            {canWallet && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onPayWallet(quote.id)}
                className="min-h-11 w-full rounded-xl border border-brand-accent px-4 text-sm font-semibold text-brand-accent disabled:opacity-50"
              >
                Pay from wallet ({nairaText(walletKobo as number)})
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecline(quote.id)}
              className="min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
            >
              Decline
            </button>
          </div>
        ) : (
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${chip.cls}`}>
            {chip.label}
          </span>
        )}
      </div>
    </div>
  );
}