"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useHubApi } from "@/lib/hub/useHubApi";
import { usePaystackPopup } from "@/lib/hub/usePaystackPopup";
import { formatNaira } from "@/lib/hub/config";
import { WALLET_LIMITS } from "@/lib/wallet/config";

interface Tx {
  _id: string;
  type: "credit" | "debit";
  reason: "topup" | "order_payment" | "refund" | "adjustment";
  amountKobo: number;
  balanceAfterKobo: number;
  note: string | null;
  createdAt: string;
}

const REASON_LABEL: Record<Tx["reason"], string> = {
  topup: "Wallet top-up",
  order_payment: "Order payment",
  refund: "Refund",
  adjustment: "Adjustment",
};

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000]; // naira

export default function WalletPage() {
  const api = useHubApi();
  const openPaystack = usePaystackPopup();

  const [balanceKobo, setBalanceKobo] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ balanceKobo: number; transactions: Tx[] }>("/api/hub/wallet");
      setBalanceKobo(r.balanceKobo);
      setTxs(r.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your wallet");
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function topUp() {
    if (busy) return;
    setError(null);
    setMessage(null);

    const amountKobo = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountKobo) || amountKobo < WALLET_LIMITS.minTopupKobo) {
      return setError(`The minimum top-up is ${formatNaira(WALLET_LIMITS.minTopupKobo)}`);
    }
    if (amountKobo > WALLET_LIMITS.maxTopupKobo) {
      return setError(`The maximum top-up is ${formatNaira(WALLET_LIMITS.maxTopupKobo)}`);
    }

    setBusy(true);
    try {
      const r = await api<{ accessCode: string; reference: string }>("/api/hub/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amountKobo }),
      });

      await openPaystack(r.accessCode, {
        onSuccess: async (reference) => {
          try {
            const v = await api<{ balanceKobo: number }>("/api/hub/wallet/topup/verify", {
              method: "POST",
              body: JSON.stringify({ reference }),
            });
            setBalanceKobo(v.balanceKobo);
            setAmount("");
            setMessage("Your wallet has been topped up.");
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : "We couldn't confirm your top-up yet.");
          } finally {
            setBusy(false);
          }
        },
        onCancel: () => {
          setBusy(false);
          setError("Top-up not completed.");
        },
        onError: (m) => {
          setBusy(false);
          setError(m);
        },
      });
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not start the top-up");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub" aria-label="Back to Hub" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Wallet</h1>
      </div>

      <div className="rounded-2xl bg-sunshine p-5">
        <p className="text-xs font-medium text-brand/70">Balance</p>
        <p className="text-2xl font-extrabold text-brand">
          {balanceKobo === null ? "…" : formatNaira(balanceKobo)}
        </p>
        <p className="mt-1 text-xs text-brand/70">
          Use it to pay for Hub orders. Refunds for cancelled orders land here.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">Top up</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(String(n))}
              className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-brand"
            >
              {formatNaira(n * 100)}
            </button>
          ))}
        </div>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in ₦"
          className="w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-brand outline-none placeholder:text-steel"
        />
        <button
          type="button"
          onClick={topUp}
          disabled={busy}
          className="w-full rounded-xl bg-sunshine py-3 text-sm font-extrabold text-brand disabled:opacity-60"
        >
          {busy ? "Working…" : "Top up with Paystack"}
        </button>
        <p className="text-[11px] text-steel">🔒 Secured by Paystack</p>
      </div>

      {message && <p className="rounded-2xl bg-green-50 p-4 text-center text-xs text-green-700">{message}</p>}
      {error && <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">{error}</p>}

      <div className="space-y-2">
        <p className="text-sm font-bold text-brand">History</p>
        {txs.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-center text-xs text-steel shadow-card">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-card">
            {txs.map((t) => (
              <div key={t._id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-brand">{t.note ?? REASON_LABEL[t.reason]}</p>
                  <p className="text-xs text-steel">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-bold ${t.type === "credit" ? "text-green-600" : "text-brand"}`}>
                    {t.type === "credit" ? "+" : "−"}
                    {formatNaira(t.amountKobo)}
                  </p>
                  <p className="text-xs text-steel">Balance {formatNaira(t.balanceAfterKobo)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}