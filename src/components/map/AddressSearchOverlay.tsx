"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Bike, Truck } from "lucide-react";
import MapboxAddressInput, { type PlaceResult } from "@/components/map/MapboxAddressInput";
import { haversineKm, estimateMinutes } from "@/lib/pricing/distance";
import { calculateDeliveryFee } from "@/lib/pricing/calculateDeliveryFee";

export type VehicleType = "bicycle" | "motorcycle" | "cargo";

interface AddressSearchOverlayProps {
  initialPickup?: string;
  initialDropoff?: string;
  // New — lets the Rides page open this overlay with a vehicle already
  // selected when the rider taps a Bicycle/Motorcycle/Cargo card. Optional,
  // so any other caller keeps working exactly as before.
  defaultVehicleType?: VehicleType | null;
  error?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (data: {
    pickup: string;
    dropoff: string;
    note: string;
    pickupPlace: PlaceResult;
    dropoffPlace: PlaceResult;
    receiverName: string;
    receiverPhone: string;
    pickupContactName?: string;
    pickupContactPhone?: string;
    vehicleType: VehicleType;
  }) => void;
}

// Simple inline motorcycle icon — lucide doesn't ship one, so this is a
// minimal custom SVG rather than reusing the bicycle icon for both.
// Exported so the Rides page can reuse the same icon on its vehicle cards.
export function MotorcycleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="5" cy="17" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 17h4l2-5h4l3 5h2M11 12l2-3h3M8 17l2-5"
      />
    </svg>
  );
}

const VEHICLE_OPTIONS: { key: VehicleType; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { key: "bicycle", label: "Bicycle", icon: (p) => <Bike {...p} /> },
  { key: "motorcycle", label: "Motorcycle", icon: (p) => <MotorcycleIcon {...p} /> },
  { key: "cargo", label: "Cargo", icon: (p) => <Truck {...p} /> },
];

export default function AddressSearchOverlay({
  initialPickup = "",
  initialDropoff = "",
  defaultVehicleType = null,
  error,
  submitting = false,
  onClose,
  onConfirm,
}: AddressSearchOverlayProps) {
  const [pickup, setPickup] = useState(initialPickup);
  const [dropoff, setDropoff] = useState(initialDropoff);
  const [pickupPlace, setPickupPlace] = useState<PlaceResult | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceResult | null>(null);
  const [note, setNote] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(defaultVehicleType);
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null);

  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");

  // Live fare estimate — recalculates whenever pickup, dropoff, or vehicle
  // type changes. This excludes the rider-to-pickup leg (no rider is
  // assigned yet at this point), same approach used for Hub checkout —
  // so it's shown as an estimate, and the final fee firms up once a rider accepts.
  useEffect(() => {
    if (!pickupPlace || !dropoffPlace || !vehicleType) {
      setEstimatedFee(null);
      return;
    }

    const km = haversineKm(
      { lat: pickupPlace.lat, lng: pickupPlace.lng },
      { lat: dropoffPlace.lat, lng: dropoffPlace.lng }
    );
    const minutes = estimateMinutes(km, vehicleType);

    const { deliveryFee } = calculateDeliveryFee({
      vehicleType,
      riderToPickupKm: 0,
      riderToPickupMinutes: 0,
      pickupToDropoffKm: km,
      pickupToDropoffMinutes: minutes,
    });

    setEstimatedFee(deliveryFee);
  }, [pickupPlace, dropoffPlace, vehicleType]);

  const canConfirm =
    !!pickupPlace &&
    !!dropoffPlace &&
    !!vehicleType &&
    receiverName.trim().length > 0 &&
    receiverPhone.trim().length > 0;

  function handleConfirm() {
    if (!canConfirm || submitting) return;
    onConfirm({
      pickup,
      dropoff,
      note,
      pickupPlace: pickupPlace!,
      dropoffPlace: dropoffPlace!,
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      pickupContactName: pickupContactName.trim() || undefined,
      pickupContactPhone: pickupContactPhone.trim() || undefined,
      vehicleType: vehicleType!,
    });
  }

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
        {/* Vehicle type */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Vehicle type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLE_OPTIONS.map((v) => {
              const Icon = v.icon;
              const selected = vehicleType === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVehicleType(v.key)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition ${
                    selected
                      ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                      : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

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

        {/* Fare estimate — appears once pickup, dropoff, and vehicle are all set */}
        {estimatedFee !== null && (
          <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Estimated fare
              </span>
              <span className="text-lg font-bold text-brand dark:text-white">
                ₦{estimatedFee.toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Final price may vary slightly once a rider is matched
            </p>
          </div>
        )}

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

        <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Receiver details
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receiver name
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Who's receiving this?"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Receiver phone
              </label>
              <input
                type="tel"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="Phone number the courier can call"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pickup contact <span className="font-normal normal-case text-slate-400">(optional — defaults to you)</span>
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contact name
              </label>
              <input
                type="text"
                value={pickupContactName}
                onChange={(e) => setPickupContactName(e.target.value)}
                placeholder="Leave blank to use your name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contact phone
              </label>
              <input
                type="tel"
                value={pickupContactPhone}
                onChange={(e) => setPickupContactPhone(e.target.value)}
                placeholder="Leave blank to use your phone"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 p-4 dark:border-slate-800">
        {error && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          disabled={!canConfirm || submitting}
          onClick={handleConfirm}
          style={{
            animation: canConfirm && !submitting ? "confirm-glow 2s ease-in-out infinite" : "none",
          }}
          className="relative flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:brightness-100"
        >
          {submitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Sending request…
            </>
          ) : (
            "Confirm request"
          )}
        </button>
      </div>

      <style jsx global>{`
        @keyframes confirm-glow {
          0%,
          100% {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 0 rgba(99, 102, 241, 0.4);
          }
          50% {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 6px rgba(99, 102, 241, 0);
          }
        }
      `}</style>
    </div>
  );
}