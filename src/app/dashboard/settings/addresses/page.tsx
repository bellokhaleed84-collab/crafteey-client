"use client";

import { useState } from "react";
import { Home, Briefcase, MapPin, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SettingsHeader from "@/components/SettingsHeader";

type SavedAddress = { label: string; address: string };

const LABELS = ["Home", "Work", "Other"];
const MAX_ADDRESSES = 10;

const INPUT =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-accent focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function iconFor(label: string) {
  if (label === "Home") return Home;
  if (label === "Work") return Briefcase;
  return MapPin;
}

export default function AddressesPage() {
  const { client, getIdToken, refetchClient } = useAuth();
  const addresses: SavedAddress[] = ((client as any)?.addresses ?? []) as SavedAddress[];

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persist(next: SavedAddress[]) {
    setSaving(true);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/clients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ addresses: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save that address. Try again.");
      }
      await refetchClient();
      return true;
    } catch (err: any) {
      setError(err.message || "Couldn't save that address. Try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    const trimmed = address.trim();
    if (!trimmed) return;
    const ok = await persist([...addresses, { label, address: trimmed }]);
    if (ok) {
      setAddress("");
      setLabel("Home");
      setAdding(false);
    }
  }

  async function handleRemove(index: number) {
    await persist(addresses.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <SettingsHeader title="Saved Addresses" subtitle="Manage your pickup and delivery locations." />

      {addresses.length === 0 && !adding && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-slate-800">
            <MapPin className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">No saved addresses yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Add your home or work address to keep track of the places you use most.
          </p>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {addresses.map((a, i) => {
            const Icon = iconFor(a.label);
            return (
              <div key={`${a.label}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-accent dark:bg-slate-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{a.label}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{a.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(i)}
                  disabled={saving}
                  aria-label={`Remove ${a.label} address`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {adding ? (
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Label</label>
            <div className="mt-1 flex gap-2">
              {LABELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                    label === l
                      ? "border-brand-accent bg-blue-50 text-brand-accent dark:bg-slate-800"
                      : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, area, city"
              className={INPUT}
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setAdding(false);
                setAddress("");
                setError(null);
              }}
              disabled={saving}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !address.trim()}
              className="flex-1 rounded-xl bg-brand-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save address"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            onClick={() => setAdding(true)}
            disabled={addresses.length >= MAX_ADDRESSES}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-accent py-3.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Add new address
          </button>
        </>
      )}
    </div>
  );
}