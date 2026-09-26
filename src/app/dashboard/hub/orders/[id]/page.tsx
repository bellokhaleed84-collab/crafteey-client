"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Phone } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useHubApi } from "@/lib/hub/useHubApi";
import { usePaystackPopup } from "@/lib/hub/usePaystackPopup";
import { formatNaira, type HubOrderStatus } from "@/lib/hub/config";
import type { HubOrderDTO } from "@/lib/hub/types";
import RouteMap, { type LatLng } from "@/components/map/RouteMap";

const STEPS: { key: HubOrderStatus; label: string }[] = [
  { key: "paid", label: "Order placed" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "On the way" },
  { key: "delivered", label: "Delivered" },
];

const HERO: Record<HubOrderStatus, { emoji: string; title: string; text: string }> = {
  pending_payment: { emoji: "⏳", title: "Awaiting payment", text: "Complete your payment to place this order." },
  paid: { emoji: "✅", title: "Order placed", text: "Payment received. The vendor will start preparing it soon." },
  preparing: { emoji: "👨‍🍳", title: "Being prepared", text: "Your order is being prepared." },
  out_for_delivery: { emoji: "🛵", title: "On the way", text: "A rider is bringing your order." },
  delivered: { emoji: "🎉", title: "Delivered", text: "Enjoy! Thanks for ordering with Crafteey." },
  cancelled: { emoji: "❌", title: "Cancelled", text: "This order was cancelled." },
};

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: "Bicycle",
  motorcycle: "Motorcycle",
  cargo: "Cargo",
};

const COURIER_STATUS_TEXT: Record<string, string> = {
  accepted: "Heading to the vendor",
  picked_up: "Picked up your order",
  en_route: "On the way to you",
  delivered: "Delivered",
};

const RIDER_APP_URL = process.env.NEXT_PUBLIC_RIDER_APP_URL ?? "";

interface LiveLocation {
  lat: number;
  lng: number;
  live: boolean;
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const reference = useSearchParams().get("reference");
  const router = useRouter();
  const api = useHubApi();
  const { getIdToken } = useAuth();
  const openPaystack = usePaystackPopup();
  const { clear } = useCart();

  const [order, setOrder] = useState<HubOrderDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<boolean>(Boolean(reference));
  const [paying, setPaying] = useState<boolean>(false);
  const started = useRef<boolean>(false);

  const [liveLocation, setLiveLocation] = useState<LiveLocation | null>(null);
  const locationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const d = await api<{ order: HubOrderDTO }>(`/api/hub/orders/${id}`);
      setOrder(d.order);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load order");
    }
  }, [api, id]);

  const confirmPayment = useCallback(
    async (ref: string) => {
      setConfirming(true);
      try {
        const v = await api<{ paid: boolean }>(`/api/hub/paystack/verify?reference=${encodeURIComponent(ref)}`);
        if (v.paid) clear();
      } catch {
        /* the webhook may still confirm it */
      }
      await fetchOrder();
      setConfirming(false);
    },
    [api, clear, fetchOrder]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (reference) {
      confirmPayment(reference).finally(() => router.replace(`/dashboard/hub/orders/${id}`));
    } else {
      fetchOrder();
    }
  }, [reference, id, confirmPayment, fetchOrder, router]);

  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "cancelled") return;
    const t = setInterval(fetchOrder, 20000);
    return () => clearInterval(t);
  }, [order, fetchOrder]);

  // Live rider location — same pattern as the direct-booking tracking
  // screen in crafteey-rider's client-side counterpart (RiderPage.tsx),
  // polling crafteey-rider's cross-origin location endpoint directly.
  const fetchLiveLocation = useCallback(
    async (requestId: string) => {
      if (!RIDER_APP_URL) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${RIDER_APP_URL}/api/courier-requests/${requestId}/location`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.lat === "number" && typeof data.lng === "number") {
          setLiveLocation({ lat: data.lat, lng: data.lng, live: Boolean(data.live) });
        }
      } catch {
        // a missed poll just means the map keeps showing the last position
      }
    },
    [getIdToken]
  );

  const courierRequestId: string | undefined = order?.courier?.requestId;
  const courierStatus: string | undefined = order?.courier?.status;
  const isCourierTrackable: boolean = Boolean(courierRequestId) && courierStatus !== "delivered";

  useEffect(() => {
    if (locationPollRef.current) {
      clearInterval(locationPollRef.current);
      locationPollRef.current = null;
    }
    if (courierRequestId && isCourierTrackable) {
      fetchLiveLocation(courierRequestId);
      locationPollRef.current = setInterval(() => fetchLiveLocation(courierRequestId), 6000);
    } else {
      setLiveLocation(null);
    }
    return () => {
      if (locationPollRef.current) clearInterval(locationPollRef.current);
    };
  }, [courierRequestId, isCourierTrackable, fetchLiveLocation]);

  async function payNow() {
    setPaying(true);
    setError(null);
    try {
      const r = await api<{ accessCode: string }>(`/api/hub/orders/${id}/pay`, { method: "POST" });
      await openPaystack(r.accessCode, {
        onSuccess: (ref: string) => {
          setPaying(false);
          confirmPayment(ref);
        },
        onCancel: () => setPaying(false),
        onError: (m: string) => {
          setPaying(false);
          setError(m);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment");
      setPaying(false);
    }
  }

  const stepIndex = order ? STEPS.findIndex((s) => s.key === order.status) : -1;
  const hero = order ? HERO[order.status] : null;

  const courier = order?.courier ?? null;

  const pickupCoords: LatLng | null =
    courier && typeof courier.pickupLat === "number" && typeof courier.pickupLng === "number"
      ? { lat: courier.pickupLat, lng: courier.pickupLng }
      : null;

  const dropoffCoords: LatLng | null =
    courier && typeof courier.dropoffLat === "number" && typeof courier.dropoffLng === "number"
      ? { lat: courier.dropoffLat, lng: courier.dropoffLng }
      : null;

  const courierMapLocation: LatLng | null = liveLocation
    ? { lat: liveLocation.lat, lng: liveLocation.lng }
    : courier?.location ?? null;

  const hasMapData: boolean = Boolean(pickupCoords || dropoffCoords || courierMapLocation);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hub/orders" aria-label="Back to orders" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Order Status</h1>
      </div>

      {error && <p className="rounded-2xl bg-red-50 p-4 text-center text-xs text-red-600">{error}</p>}

      {confirming ? (
        <div className="rounded-2xl bg-sunshine p-6 text-center">
          <p className="text-4xl">⏳</p>
          <p className="mt-2 text-sm font-extrabold text-brand">Confirming your payment…</p>
          <p className="mt-1 text-xs font-medium text-brand/70">This only takes a moment.</p>
        </div>
      ) : !order ? (
        !error && <div className="h-32 animate-pulse rounded-2xl bg-white shadow-card" />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-2xl bg-sunshine p-5">
            <div>
              <p className="text-base font-extrabold text-brand">{hero ? hero.title : ""}</p>
              <p className="mt-1 text-xs font-medium text-brand/70">{hero ? hero.text : ""}</p>
              {order.orderNumber && (
                <p className="mt-1 text-xs font-semibold text-brand/60">Order #{order.orderNumber}</p>
              )}
            </div>
            <span className="text-4xl" aria-hidden>
              {hero ? hero.emoji : ""}
            </span>
          </div>

          {order.status === "pending_payment" && (
            <button
              type="button"
              onClick={payNow}
              disabled={paying}
              className="flex w-full items-center justify-between rounded-2xl bg-white px-5 py-3.5 text-brand shadow-card disabled:opacity-60"
            >
              <span className="text-sm font-extrabold">{paying ? "Waiting for payment…" : "Pay now"}</span>
              <span className="text-sm font-extrabold text-brand-accent">{formatNaira(order.totalKobo)}</span>
            </button>
          )}

          {stepIndex >= 0 && (
            <ol className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
              {STEPS.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={s.key} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        done ? "bg-sunshine text-brand" : "bg-surface-muted text-steel"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className={`text-sm ${done ? "font-bold text-brand" : "text-steel"}`}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {courier && (
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                {courier.name ? (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunshine text-base font-extrabold text-brand">
                    {courier.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg">
                    🛵
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand">{courier.name || "Rider assigned"}</p>
                  <p className="text-xs text-steel">
                    {COURIER_STATUS_TEXT[courier.status] ?? "On the way"}
                    {courier.vehicleType ? ` • ${VEHICLE_LABEL[courier.vehicleType] ?? courier.vehicleType}` : ""}
                  </p>
                </div>
                {courier.phone && (
                  <a
                    href={`tel:${courier.phone}`}
                    aria-label={`Call ${courier.name || "your rider"}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent transition hover:bg-brand-accent/20"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>

              {hasMapData && (
                <div className="relative">
                  <RouteMap
                    pickup={pickupCoords}
                    dropoff={dropoffCoords}
                    courierLocation={courierMapLocation}
                    className="h-[220px] w-full rounded-xl border border-slate-100"
                  />
                  {liveLocation?.live && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-brand px-2 py-1 text-[10px] font-bold text-white shadow">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Live
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-card">
            <p className="text-sm font-bold text-brand">🧾 {order.vendorName}</p>
            {order.items.map((i) => (
              <div key={i.productId} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-brand">
                  {i.quantity} × {i.name}
                </span>
                <span className="shrink-0 font-semibold text-brand">{formatNaira(i.unitPriceKobo * i.quantity)}</span>
              </div>
            ))}
            <div className="space-y-1.5 border-t border-slate-100 pt-2 text-sm">
              <div className="flex justify-between text-steel">
                <span>Delivery fee</span>
                <span className="font-semibold text-brand">{formatNaira(order.deliveryFeeKobo)}</span>
              </div>
              <div className="flex justify-between font-bold text-brand">
                <span>Total</span>
                <span>{formatNaira(order.totalKobo)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-card">
            <p className="text-sm font-bold text-brand">📍 Delivering to</p>
            <p className="mt-1 text-sm text-steel">{order.delivery.address}</p>
            {order.delivery.phone && <p className="text-sm text-steel">{order.delivery.phone}</p>}
          </div>
        </>
      )}
    </div>
  );
}