"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";

interface PayNowSheetProps {
  requestId: string;
  amountKobo: number;
  paymentStatus: string;
  riderAppUrl: string;
  getIdToken: () => Promise<string | null>;
  onClose: () => void;
  onMarkedPaid: () => void;
}

interface BankInfo {
  bankName: string | null;
  accountName: string;
  accountNumber: string;
}

function naira(kobo: number): string {
  return "\u20A6" + Math.round(kobo / 100).toLocaleString();
}

export default function PayNowSheet({
  requestId,
  amountKobo,
  paymentStatus,
  riderAppUrl,
  getIdToken,
  onClose,
  onMarkedPaid,
}: PayNowSheetProps) {
  const [loading, setLoading] = useState(true);
  const [bank, setBank] = useState<BankInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);

  const url = `${riderAppUrl}/api/courier-requests/${requestId}/payment`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!riderAppUrl) {
        setError("Payment details aren't available right now.");
        setLoading(false);
        return;
      }
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Please sign in again.");
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't load payment details.");
        if (!cancelled) setBank(data.bank ?? null);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Couldn't load payment details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  async function copyNumber() {
    if (!bank) return;
    try {
      await navigator.clipboard.writeText(bank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked - the number is still on screen
    }
  }

  async function markPaid() {
    setMarking(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "client_paid" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't update your payment.");
      onMarkedPaid();
    } catch (err: any) {
      setError(err.message || "Couldn't update your payment.");
    } finally {
      setMarking(false);
    }
  }

  const collected = paymentStatus === "collected";
  const waiting = paymentStatus === "client_marked_paid";

  return (
    <div className="fixed inset-0 z-[85] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-brand dark:text-white">Pay your courier</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl bg-sunshine px-4 py-4 text-center">
          <p className="text-xs font-semibold" style={{ color: "#0B1530" }}>
            Amount to transfer
          </p>
          <p className="text-3xl font-extrabold" style={{ color: "#0B1530" }}>
            {naira(amountKobo)}
          </p>
        </div>

        {collected ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <Check className="h-5 w-5" /> Your courier has confirmed your payment.
          </div>
        ) : loading ? (
          <p className="mt-4 text-center text-sm text-steel">Loading bank details...</p>
        ) : bank ? (
          <>
            <div className="mt-4 space-y-3 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              {bank.bankName && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Bank</p>
                  <p className="text-sm font-bold text-brand dark:text-white">{bank.bankName}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Account name</p>
                <p className="text-sm font-bold text-brand dark:text-white">{bank.accountName}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Account number</p>
                  <p className="text-lg font-extrabold tracking-wider text-brand dark:text-white">
                    {bank.accountNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="flex items-center gap-1.5 rounded-full bg-brand-accent/10 px-3 py-2 text-xs font-bold text-brand-accent"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-xs text-steel">
              Only transfer to the account shown here. Send exactly {naira(amountKobo)}, then tap
              &quot;I&apos;ve paid&quot;.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {waiting ? (
              <div className="mt-4 rounded-xl bg-brand-accent/10 px-4 py-3 text-center text-sm font-semibold text-brand-accent">
                Waiting for your courier to confirm...
              </div>
            ) : (
              <button
                type="button"
                onClick={markPaid}
                disabled={marking}
                className="mt-4 w-full rounded-xl bg-brand-accent py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
              >
                {marking ? "Please wait..." : "I've paid"}
              </button>
            )}
          </>
        ) : (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-4 text-center text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {error ??
              "Your courier hasn't added bank details yet. Ask them in chat, or pay in cash."}
          </div>
        )}
      </div>
    </div>
  );
}