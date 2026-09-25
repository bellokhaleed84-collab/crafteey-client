"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bike } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useHubApi } from "@/lib/hub/useHubApi";
import { usePaystackPopup } from "@/lib/hub/usePaystackPopup";
import { formatNaira } from "@/lib/hub/config";
import MapboxAddressInput, { type PlaceResult } from "@/components/map/MapboxAddressInput";
import { MotorcycleIcon } from "@/components/map/AddressSearchOverlay"; // adjust path if this lives elsewhere

type Stage = "idle" | "creating" | "paying";
type VehicleType = "bicycle" | "motorcycle";

const input =
  "w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-brand outline-none placeholder:text-steel";

const VEHICLE_OPTIONS: { key: VehicleType; label: string }[] = [
  { key: "bicycle", label: "Bicycle" },
  { key: "motorcycle", label: "Motorcycle" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { client } = useAuth();
  const { items, hydrated, vendorId, vendorName, subtotalKobo, clear } = useCart();
  const api = useHubApi();
  const openPaystack = usePaystackPopup();

  const [address, setAddress] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState<PlaceResult | null>(null);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState<{ orderId: string; sig: string } | null>(null);

  // Live delivery-fee preview
  const [fee, setFee] = useState<{ deliveryFeeKobo: number; distanceKm: number } | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  useEffect(() => {
    if (client?.phone && !phone) setPhone(client.phone);
  }, [client, phone]);

  useEffect(() => {
    if (hydrated && items.length === 0 && !done) router.replace("/dashboard/hub/cart");
  }, [hydrated, items.length, done, router]);

  // Debounced live preview — refetches whenever vehicle or address changes
  useEffect(() => {
    if (!vendorId || !vehicleType || !deliveryPlace) {
      setFee(null);
      return;
    }
    setFeeError(null);
    setFeeLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await api<{ deliveryFeeKobo: number; distanceKm: number }>("/api/hub/delivery-fee-preview", {
          method: "POST",
          body: JSON.stringify({
            vendorId,
            vehicleType,
            deliveryLat: deliveryPlace.lat,
            deliveryLng: deliveryPlace.lng,
          }),
        });
        setFee(r);
      } catch (err) {
        setFee(null);
        setFeeError(err instanceof Error ? err.message : "Could not calculate delivery fee");
      } finally {
        setFeeLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [vendorId, vehicleType, deliveryPlace, api]);

  function handleAddressChange(text: string) {
    setAddress(text);
    if (deliveryPlace && text !== deliveryPlace.address) setDeliveryPlace(null);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (stage !== "idle") return;
    setError(null);

    if (!vehicleType) return setError("Please choose a delivery vehicle");
    if (!deliveryPlace) return setError("Please select your delivery address from the suggestions list");

    setStage("creating");

    try {
      const sig = JSON.stringify({
        i: items.map((i) => [i.productId, i.quantity]),
        a: address.trim(),
        p: phone.trim(),
        n: note.trim(),
        v: vehicleType,
        lat: deliveryPlace.lat,
        lng: deliveryPlace.lng,
      });

      let orderId: string;
      let accessCode: string;

      if (pending && pending.sig === sig) {
        const r = await api<{ accessCode: string }>(`/api/hub/orders/${pending.orderId}/pay`, { method: "POST" });
        orderId = pending.orderId;
        accessCode = r.accessCode;
      } else {
        const r = await api<{ orderId: string; accessCode: string }>("/api/hub/orders", {
          method: "POST",
          body: JSON.stringify({
            items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            delivery: { address, phone, note },
            vehicleType,
            deliveryLat: deliveryPlace.lat,
            deliveryLng: deliveryPlace.lng,
          }),
        });
        orderId = r.orderId;
        accessCode = r.accessCode;
        setPending({ orderId, sig });
      }

      setStage("paying");
      await openPaystack(accessCode, {
        onSuccess: (reference) => {
          setDone(true);
          clear();
          router.push(`/dashboard/hub/orders/${orderId}?reference=${encodeURIComponent(reference)}`);
        },
        onCancel: () => {
          setStage("idle");
          setError("Payment not completed. Your order is saved — tap Pay to try again.");
        },
        onError: (message) => {
          setStage("idle");
          setError(message);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setStage("idle");
    }
  }

  const busy = stage !== "idle";
  const totalKobo = fee ? subtotalKobo + fee.deliveryFeeKobo : subtotalKobo;

  return (
    <form onSubmit={pay} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub/cart" aria-label="Back to cart" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Checkout</h1>
      </div>

      {/* vehicle type */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">🚲 Delivery vehicle</p>
        <div className="grid grid-cols-2 gap-2">
          {VEHICLE_OPTIONS.map((v) => {
            const selected = vehicleType === v.key;
            const Icon = v.key === "bicycle" ? Bike : MotorcycleIcon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setVehicleType(v.key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition ${
                  selected
                    ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
                    : "border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                <Icon className="h-5 w-5" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* delivery details */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">📍 Delivery details</p>
        <MapboxAddressInput
          label="Delivery address"
          placeholder="Search for your delivery address"
          value={address}
          onChange={handleAddressChange}
          onSelect={setDeliveryPlace}
        />
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number for the rider"
          className={input}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Note for the rider (optional)"
          className={input}
        />
      </div>

      {/* order summary */}
      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-brand">🧾 Your order</p>
          <span className="text-xs text-steel">{vendorName}</span>
        </div>
        {items.map((i) => (
          <div key={i.productId} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-brand">
              {i.quantity} × {i.name}
            </span>
            <span className="shrink-0 font-semibold text-brand">{formatNaira(i.priceKobo * i.quantity)}</span>
          </div>
        ))}
        <div className="space-y-1.5 border-t border-slate-100 pt-2 text-sm">
          <div className="flex justify-between text-steel">
            <span>Subtotal</span>
            <span className="font-semibold text-brand">{formatNaira(subtotalKobo)}</span>
          </div>
          <div className="flex justify-between text-steel">
            <span>Delivery fee {fee && `(${fee.distanceKm}km)`}</span>
            <span className="font-semibold text-brand">
              {feeLoading
                ? "Calculating…"
                : fee
                ? formatNaira(fee.deliveryFeeKobo)
                : vehicleType && deliveryPlace
                ? "—"
                : "Choose vehicle & address"}
            </span>
          </div>
          {feeError && <p className="text-xs text-red-600">{feeError}</p>}
          <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-brand">
            <span>Total</span>
            <span>{fee ? formatNaira(totalKobo) : "—"}</span>
          </div>
        </div>
      </div>

      {/* payment */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">💳 Payment</p>
        <p className="text-xs text-steel">
          Pay right here without leaving the app. Pick your method after tapping Pay.
        </p>
        <div className="flex flex-wrap gap-2">
          {["💳 Card", "🏦 Bank transfer", "📲 USSD"].map((m) => (
            <span key={m} className="rounded-xl bg-surface-muted px-3 py-1.5 text-xs font-semibold text-brand">
              {m}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-steel">🔒 Secured by Paystack</p>
      </div>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">{error}</p>}

      <div className="sticky bottom-20 z-20">
        <button
          type="submit"
          disabled={busy || items.length === 0}
          className="flex w-full items-center justify-between rounded-2xl bg-sunshine px-5 py-3.5 text-brand shadow-card disabled:opacity-60"
        >
          <span className="text-sm font-extrabold">
            {stage === "creating" ? "Preparing payment…" : stage === "paying" ? "Waiting for payment…" : "Pay now"}
          </span>
          {fee && <span className="text-sm font-extrabold">{formatNaira(totalKobo)}</span>}
        </button>
      </div>
    </form>
  );
}