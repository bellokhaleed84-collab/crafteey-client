"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bike } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, unitPriceOf } from "@/contexts/CartContext";
import { useHubApi } from "@/lib/hub/useHubApi";
import { useCartCheck } from "@/lib/hub/useCartCheck";
import { usePaystackPopup } from "@/lib/hub/usePaystackPopup";
import { formatNaira } from "@/lib/hub/config";
import MapboxAddressInput, { type PlaceResult } from "@/components/map/MapboxAddressInput";
import { MotorcycleIcon } from "@/components/map/AddressSearchOverlay"; // adjust path if this lives elsewhere

type Stage = "idle" | "creating" | "paying";
type VehicleType = "bicycle" | "motorcycle";
type PayMethod = "paystack" | "wallet";

const input =
  "w-full rounded-xl bg-surface-muted px-4 py-3 text-sm text-brand outline-none placeholder:text-steel";

const VEHICLE_OPTIONS: { key: VehicleType; label: string }[] = [
  { key: "bicycle", label: "Bicycle" },
  { key: "motorcycle", label: "Motorcycle" },
];

const methodClass = (selected: boolean) =>
  `flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-xs font-semibold transition ${
    selected
      ? "border-brand-accent bg-brand-accent/10 text-brand-accent"
      : "border-slate-200 text-slate-500 hover:border-slate-300"
  }`;

export default function CheckoutPage() {
  const router = useRouter();
  const { client } = useAuth();
  const { items, hydrated, vendorId, vendorName, removeItem, clear } = useCart();
  const check = useCartCheck();
  const api = useHubApi();
  const openPaystack = usePaystackPopup();

  const [address, setAddress] = useState("");
  const [deliveryPlace, setDeliveryPlace] = useState<PlaceResult | null>(null);
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("paystack");
  const [walletBalanceKobo, setWalletBalanceKobo] = useState<number | null>(null);
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

  // Wallet balance, so the wallet option can say whether it covers the order.
  useEffect(() => {
    let cancelled = false;
    api<{ balanceKobo: number }>("/api/hub/wallet")
      .then((r) => {
        if (!cancelled) setWalletBalanceKobo(r.balanceKobo);
      })
      .catch(() => {
        if (!cancelled) setWalletBalanceKobo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  // Debounced live preview - refetches whenever vehicle or address changes
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

  function removeUnavailable() {
    check.removableIds.forEach((id) => removeItem(id));
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (stage !== "idle") return;
    setError(null);

    if (check.storeClosed) return setError(`${vendorName ?? "This store"} is closed right now.`);
    if (check.hasBlockingIssue) return setError("Some items in your cart can't be ordered right now.");
    if (!vehicleType) return setError("Please choose a delivery vehicle");
    if (!deliveryPlace) return setError("Please select your delivery address from the suggestions list");

    setStage("creating");

    try {
      // lineId already includes the options picked, so a changed cart makes a new order
      const sig = JSON.stringify({
        i: items.map((i) => [i.lineId, i.quantity]),
        a: address.trim(),
        p: phone.trim(),
        n: note.trim(),
        v: vehicleType,
        lat: deliveryPlace.lat,
        lng: deliveryPlace.lng,
      });

      let orderId: string;
      let accessCode: string | null = null;

      if (pending && pending.sig === sig) {
        // Retrying an order that was already created: reuse it.
        orderId = pending.orderId;
        if (payMethod === "paystack") {
          const r = await api<{ accessCode: string }>(`/api/hub/orders/${orderId}/pay`, { method: "POST" });
          accessCode = r.accessCode;
        }
      } else {
        // Only which food, how many plates and which options are sent. The server works out the prices.
        const r = await api<{ orderId: string; accessCode: string }>("/api/hub/orders", {
          method: "POST",
          body: JSON.stringify({
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              selections: i.selections ?? [],
            })),
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

      if (payMethod === "wallet") {
        await api(`/api/hub/orders/${orderId}/pay-wallet`, { method: "POST" });
        setDone(true);
        clear();
        router.push(`/dashboard/hub/orders/${orderId}`);
        return;
      }

      await openPaystack(accessCode as string, {
        onSuccess: (reference) => {
          setDone(true);
          clear();
          router.push(`/dashboard/hub/orders/${orderId}?reference=${encodeURIComponent(reference)}`);
        },
        onCancel: () => {
          setStage("idle");
          setError("Payment not completed. Your order is saved \u2014 tap Pay to try again.");
        },
        onError: (message) => {
          setStage("idle");
          setError(message);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setStage("idle");
      // The server may have rejected the order because the store just closed,
      // an item changed, or the wallet balance changed, so refresh what we show.
      void check.refresh();
      api<{ balanceKobo: number }>("/api/hub/wallet")
        .then((r) => setWalletBalanceKobo(r.balanceKobo))
        .catch(() => {});
    }
  }

  const busy = stage !== "idle";
  const blocked = check.hasBlockingIssue;
  const totalKobo = fee ? check.liveSubtotalKobo + fee.deliveryFeeKobo : check.liveSubtotalKobo;
  const walletShort =
    payMethod === "wallet" && fee !== null && walletBalanceKobo !== null && walletBalanceKobo < totalKobo;

  return (
    <form onSubmit={pay} className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub/cart" aria-label="Back to cart" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Checkout</h1>
      </div>

      {check.storeClosed && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">{vendorName} is closed right now</p>
          <p className="mt-0.5 text-xs">You can order when the store reopens. Your cart is saved.</p>
        </div>
      )}

      {check.anyPriceChanged && (
        <div className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
          Some prices have changed since you added them. The prices below are the current ones.
        </div>
      )}

      {check.removableIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700">
          <span>Some items can&apos;t be ordered right now.</span>
          <button
            type="button"
            onClick={removeUnavailable}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-bold text-red-700"
          >
            Remove them
          </button>
        </div>
      )}

      {/* vehicle type */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">{"\uD83D\uDEB2"} Delivery vehicle</p>
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
        <p className="text-sm font-bold text-brand">{"\uD83D\uDCCD"} Delivery details</p>
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
          <p className="text-sm font-bold text-brand">{"\uD83E\uDDFE"} Your order</p>
          <span className="text-xs text-steel">{vendorName}</span>
        </div>
        {items.map((i) => {
          const live = check.byLine[i.lineId];
          const price = live?.livePriceKobo ?? unitPriceOf(i);
          return (
            <div key={i.lineId}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-brand">
                  {i.quantity} &times; {i.name}
                </span>
                <span className="shrink-0 font-semibold text-brand">{formatNaira(price * i.quantity)}</span>
              </div>
              {i.picked && i.picked.length > 0 && (
                <p className="text-[11px] text-steel">
                  {i.picked.map((o) => o.quantity + " \u00D7 " + o.choiceName).join(", ")}
                </p>
              )}
              {live?.issue && <p className="text-xs font-semibold text-red-600">{live.issue}</p>}
            </div>
          );
        })}
        <div className="space-y-1.5 border-t border-slate-100 pt-2 text-sm">
          <div className="flex justify-between text-steel">
            <span>Subtotal</span>
            <span className="font-semibold text-brand">{formatNaira(check.liveSubtotalKobo)}</span>
          </div>
          <div className="flex justify-between text-steel">
            <span>Delivery fee {fee && `(${fee.distanceKm}km)`}</span>
            <span className="font-semibold text-brand">
              {feeLoading
                ? "Calculating\u2026"
                : fee
                ? formatNaira(fee.deliveryFeeKobo)
                : vehicleType && deliveryPlace
                ? "\u2014"
                : "Choose vehicle & address"}
            </span>
          </div>
          {feeError && <p className="text-xs text-red-600">{feeError}</p>}
          <div className="flex justify-between border-t border-slate-100 pt-1.5 font-bold text-brand">
            <span>Total</span>
            <span>{fee ? formatNaira(totalKobo) : "\u2014"}</span>
          </div>
        </div>
      </div>

      {/* payment */}
      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-sm font-bold text-brand">{"\uD83D\uDCB3"} Payment</p>

        <div className="space-y-2">
          <button type="button" onClick={() => setPayMethod("paystack")} className={methodClass(payMethod === "paystack")}>
            <span>Card, bank transfer or USSD</span>
            <span className="text-[11px] font-medium">Paystack</span>
          </button>
          <button type="button" onClick={() => setPayMethod("wallet")} className={methodClass(payMethod === "wallet")}>
            <span>{"\uD83D\uDC5B"} Crafteey wallet</span>
            <span className="text-[11px] font-medium">
              {walletBalanceKobo === null ? "\u2026" : formatNaira(walletBalanceKobo)}
            </span>
          </button>
        </div>

        {payMethod === "wallet" && walletShort && (
          <p className="text-xs text-red-600">
            Your wallet balance is lower than the total.{" "}
            <Link href="/dashboard/hub/wallet" className="font-bold underline">
              Top up
            </Link>
          </p>
        )}
        {payMethod === "wallet" && !fee && (
          <p className="text-xs text-steel">Choose a vehicle and address to see if your balance covers this order.</p>
        )}
        {payMethod === "paystack" && (
          <p className="text-xs text-steel">
            Pay right here without leaving the app. Pick your method after tapping Pay.
          </p>
        )}
        <p className="text-[11px] text-steel">{"\uD83D\uDD12"} Secured by Paystack</p>
      </div>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">{error}</p>}

      <div className="sticky bottom-20 z-20">
        <button
          type="submit"
          disabled={busy || items.length === 0 || blocked || walletShort}
          className="flex w-full items-center justify-between rounded-2xl bg-sunshine px-5 py-3.5 text-brand shadow-card disabled:opacity-60"
        >
          <span className="text-sm font-extrabold">
            {stage === "creating"
              ? "Preparing payment\u2026"
              : stage === "paying"
              ? "Waiting for payment\u2026"
              : check.storeClosed
              ? "Store is closed"
              : blocked
              ? "Fix your cart to continue"
              : walletShort
              ? "Not enough wallet balance"
              : payMethod === "wallet"
              ? "Pay with wallet"
              : "Pay now"}
          </span>
          {fee && !blocked && <span className="text-sm font-extrabold">{formatNaira(totalKobo)}</span>}
        </button>
      </div>
    </form>
  );
}