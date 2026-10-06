"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import { SkeletonList } from "@/components/ui/Skeleton";

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
  yearsOperating: number;
};

const PRICE_LABEL: Record<string, string> = {
  low: "\u20A6 Budget",
  mid: "\u20A6\u20A6 Mid-range",
  high: "\u20A6\u20A6\u20A6 Premium",
};

// Trades are stored as codes. This makes them readable until we share the labels list.
function prettyTrade(t: string): string {
  const s = t.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const inputClasses =
  "block w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function CompaniesPage() {
  const router = useRouter();
  const { getIdToken } = useAuth();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Company | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authedFetch(getIdToken, "/api/companies");
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "Couldn't load companies.");
        setCompanies(data.companies ?? []);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Couldn't load companies.");
      }
    })();
  }, [getIdToken]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authedFetch(getIdToken, "/api/chat/start", {
        method: "POST",
        body: JSON.stringify({ companyId: selected._id, title, description, area }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't start the chat. Try again.");
      router.push(`/dashboard/chats/${data.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start the chat. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => {
            setSelected(null);
            setError(null);
          }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div>
          <h1 className="text-lg font-bold text-brand dark:text-white">Request {selected.businessName}</h1>
          <p className="mt-1 text-sm text-steel">
            Tell them what you need. A chat opens right away, and they will send you a quote there.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border-l-4 border-red-500 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              What do you need?
            </label>
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
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Area / address
            </label>
            <input
              className={inputClasses}
              maxLength={200}
              placeholder="e.g. 12 Adeola Street, Ikeja"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
          <p className="text-xs text-steel">Don't include phone numbers, emails or links. Everything stays in Crafteey chat.</p>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-50"
          >
            {submitting ? "Starting chat..." : "Send request"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand dark:text-white">Companies</h1>
        <p className="text-sm text-steel">Pick a company and chat with them about your job.</p>
      </div>

      {loadError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {!companies && !loadError && <SkeletonList count={3} />}

      {companies && companies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-steel">No companies are available yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {companies?.map((c) => (
          <div key={c._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-start gap-3">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-contain" />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sunshine/30 text-lg font-bold text-brand"
                >
                  {c.businessName.trim().charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-brand">
                  {c.businessName}
                  {c.verified && <span className="ml-2 text-xs font-semibold text-emerald-600">Verified</span>}
                </p>
                <p className="mt-0.5 text-xs text-steel">
                  {c.ratingCount > 0 ? `\u2605 ${c.rating.toFixed(1)} (${c.ratingCount})` : "New"} {"\u00B7"}{" "}
                  {PRICE_LABEL[c.priceRange] ?? ""} {"\u00B7"} {c.yearsOperating}y
                </p>
                <p className="mt-1 text-xs text-steel">{c.trades.map(prettyTrade).join(", ")}</p>
                <p className="mt-0.5 text-xs text-slate-400">{c.areas.slice(0, 4).join(", ")}</p>
              </div>
            </div>
            {c.description && <p className="mt-3 line-clamp-2 text-sm text-steel">{c.description}</p>}
            <button
              onClick={() => setSelected(c)}
              className="mt-3 w-full rounded-xl bg-sunshine px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-sunshine-light"
            >
              Request this company
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}