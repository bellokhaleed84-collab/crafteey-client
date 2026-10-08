"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, CreditCard, Bike, Wrench, Smartphone, User, HelpCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import SettingsHeader from "@/components/SettingsHeader";

const OPTIONS: { value: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { value: "order", label: "An order", icon: ShoppingBag },
  { value: "payment", label: "Payment or wallet", icon: CreditCard },
  { value: "ride", label: "A ride or delivery", icon: Bike },
  { value: "technician", label: "A technician job", icon: Wrench },
  { value: "app", label: "App not working", icon: Smartphone },
  { value: "account", label: "My account", icon: User },
  { value: "other", label: "Something else", icon: HelpCircle },
];

export default function ReportProblemPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = !!category && message.trim().length >= 5 && !sending;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const res = await authedFetch(getIdToken, "/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({ category, message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) {
        router.replace(`/dashboard/settings/support/tickets/${data.id}`);
        return;
      }
      setError(data.error || "Couldn't send your report. Try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your report. Try again.");
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title="Report a problem" subtitle="Tell us what went wrong. Our team will chat with you." />

      <section className="space-y-3">
        <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">What is it about?</h2>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={selected}
                className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-sm font-semibold transition ${
                  selected
                    ? "border-brand-accent bg-blue-50 text-brand-accent dark:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">What happened?</h2>
        <textarea
          rows={5}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us in your own words"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
          Please do not put passwords or card details here.
        </p>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canSend}
        className="min-h-14 w-full rounded-2xl bg-brand-accent text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send report"}
      </button>
    </div>
  );
}