"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import MapboxAddressInput, { type PlaceResult } from "@/components/map/MapboxAddressInput";

interface AddressSearchOverlayProps {
  initialPickup?: string;
  initialDropoff?: string;
  error?: string | null;
  onClose: () => void;
  onConfirm: (data: {
    pickup: string;
    dropoff: string;
    note: string;
    pickupPlace: PlaceResult;
    dropoffPlace: PlaceResult;
  }) => void;
}

export default function AddressSearchOverlay({
  initialPickup = "",
  initialDropoff = "",
  error,
  onClose,
  onConfirm,
}: AddressSearchOverlayProps) {
  const [pickup, setPickup] = useState(initialPickup);
  const [dropoff, setDropoff] = useState(initialDropoff);
  const [pickupPlace, setPickupPlace] = useState<PlaceResult | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceResult | null>(null);
  const [note, setNote] = useState("");

  const canConfirm = pickupPlace && dropoffPlace;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <button
          onClick={onClose}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold text-brand dark:text-white">Where to?</h1>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <MapboxAddressInput
          label="Pickup address"
          placeholder="Search for a pickup location"
          value={pickup}
          onChange={setPickup}
          onSelect={setPickupPlace}
        />
        <MapboxAddressInput
          label="Drop-off address"
          placeholder="Search for a drop-off location"
          value={dropoff}
          onChange={setDropoff}
          onSelect={setDropoffPlace}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        {error && (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          disabled={!canConfirm}
          onClick={() =>
            canConfirm &&
            onConfirm({ pickup, dropoff, note, pickupPlace: pickupPlace!, dropoffPlace: dropoffPlace! })
          }
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-light disabled:opacity-50"
        >
          Confirm request
        </button>
      </div>
    </div>
  );
}
