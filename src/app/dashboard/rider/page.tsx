"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Banknote,
  Bike,
  Check,
  ChevronRight,
  Eye,
  Landmark,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  PhoneCall,
  Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { COURIER_STATUS } from "@/lib/constants";
import { type PlaceResult } from "@/components/map/MapboxAddressInput";
import RouteMap, { type LatLng } from "@/components/map/RouteMap";
import SearchingOverlay from "@/components/map/SearchingOverlay";
import AddressSearchOverlay, {
  MotorcycleIcon,
  type VehicleType,
  type PaymentMethod,
} from "@/components/map/AddressSearchOverlay";
import BannerCarousel from "@/components/home/BannerCarousel";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import ChatSheet, { useChatUnread } from "@/components/chat/ChatSheet";
import PayNowSheet from "@/components/rides/PayNowSheet";

interface CourierRequest {
  _id: string;
  pickup: string;
  dropoff: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  courierLocation?: LatLng | null;
  note: string;
  status: string;
  vehicleType?: string;
  courierName: string | null;
  courierPhone: string | null;
  createdAt: string;
  source?: string;
  totalFeeKobo?: number | null;
  paymentMethod?: PaymentMethod;
  paymentStatus?: string;
}

function naira(kobo: number): string {
  return "\u20A6" + Math.round(kobo / 100).toLocaleString();
}

// Which step of the Booked -> Pickup -> In transit -> Delivered tracker each
// status lights up. PICKED_UP and EN_ROUTE share the "In transit" step.
const STEPS = ["Booked", "Pickup", "In transit", "Delivered"];

const STATUS_STEP: Record<string, number> = {
  [COURIER_STATUS.PENDING]: 0,
  [COURIER_STATUS.ACCEPTED]: 1,
  [COURIER_STATUS.PICKED_UP]: 2,
  [COURIER_STATUS.EN_ROUTE]: 2,
  [COURIER_STATUS.DELIVERED]: 3,
};

const STATUS_COPY: Record<string, { title: string; sub: string }> = {
  [COURIER_STATUS.PENDING]: {
    title: "Finding a courier",
    sub: "Sending your request to couriers who are online.",
  },
  [COURIER_STATUS.ACCEPTED]: {
    title: "Courier is on the way",
    sub: "Your courier is heading to the pickup location.",
  },
  [COURIER_STATUS.PICKED_UP]: {
    title: "Package picked up",
    sub: "Your courier has your package.",
  },
  [COURIER_STATUS.EN_ROUTE]: {
    title: "Delivery in progress",
    sub: "Your package is on its way to the drop-off.",
  },
};

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: "Bicycle",
  motorcycle: "Motorcycle",
  cargo: "Cargo",
};

const VEHICLE_CARDS: {
  key: VehicleType;
  label: string;
  desc: string;
  chips: string[];
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    key: "bicycle",
    label: "Bicycle",
    desc: "Perfect for short distances and light errands.",
    chips: ["Affordable", "Eco-friendly", "Quick"],
    icon: Bike,
  },
  {
    key: "motorcycle",
    label: "Motorcycle",
    desc: "Faster and more comfortable for longer distances.",
    chips: ["Fast", "Safe", "Reliable"],
    icon: MotorcycleIcon,
  },
  {
    key: "cargo",
    label: "Cargo",
    desc: "Transport goods, paper, printing materials & more.",
    chips: ["Spacious", "Secure", "Affordable"],
    icon: Truck,
  },
];

// Once a courier is assigned and actually en route, this is when live
// tracking matters - before that (PENDING) there's no courier to track yet.
const TRACKABLE_STATUSES: string[] = [
  COURIER_STATUS.ACCEPTED,
  COURIER_STATUS.PICKED_UP,
  COURIER_STATUS.EN_ROUTE,
];

// crafteey-rider is a separate deployment - this is a cross-origin call.
const RIDER_APP_URL = process.env.NEXT_PUBLIC_RIDER_APP_URL ?? "";

function StatusStepper({ current }: { current: number }) {
  return (
    <div className="flex items-start">
      {STEPS.map((label, i) => {
        const done = i < current;
        const isCurrent = i === current;
        return (
          <div key={label} className="contents">
            <div className="flex w-16 flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                  done
                    ? "border-brand-accent bg-brand-accent text-white"
                    : isCurrent
                    ? "border-brand-accent bg-white dark:bg-slate-900"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isCurrent ? "bg-brand-accent" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] font-semibold ${
                  done || isCurrent ? "text-brand dark:text-white" : "text-steel"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mt-[15px] h-0.5 flex-1 rounded ${
                  i < current ? "bg-brand-accent" : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RouteSummary({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <span className="my-1 h-8 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="h-3 w-3 rounded-full bg-brand-accent" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Pickup</p>
            <p className="text-sm font-semibold text-brand dark:text-slate-100">{pickup}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-steel">Drop-off</p>
            <p className="text-sm font-semibold text-brand dark:text-slate-100">{dropoff}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// The plain yellow header, shown when there are no Rides banners.
function RidesHeaderCard() {
  return (
    <div className="rounded-3xl bg-sunshine px-5 pb-5 pt-5">
      <p className="text-xs font-bold uppercase tracking-wide text-brand/60">Crafteey Rides</p>
      <h1 className="mt-1 text-2xl font-extrabold leading-tight text-brand">
        Move your world with Crafteey Rides
      </h1>
      <p className="mt-1 text-sm font-medium text-brand/70">
        Fast, safe and affordable deliveries only.
      </p>
    </div>
  );
}

export default function RiderPage() {
  const { getIdToken } = useAuth();
  const [active, setActive] = useState<CourierRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [presetVehicle, setPresetVehicle] = useState<VehicleType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  // Set right after the client taps "I've paid", until the next poll confirms it.
  const [paidOverride, setPaidOverride] = useState<string | null>(null);

  // Set when a delivery that was in progress disappears from the "active"
  // endpoint (delivered requests are no longer returned as active).
  const [completed, setCompleted] = useState<CourierRequest | null>(null);
  const prevActiveRef = useRef<CourierRequest | null>(null);

  // Whatever crafteey-rider's live endpoint most recently returned,
  // refreshed on its own timer during a delivery.
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; live: boolean } | null>(
    null
  );

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadActive = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return null;
      const res = await fetch("/api/courier-requests/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActive(data.request ?? null);
        return data.request ?? null;
      }
    } catch {
      // network hiccup - keep polling, don't surface an error mid-search
    }
    return null;
  }, [getIdToken]);

  useEffect(() => {
    (async () => {
      const req = await loadActive();
      setLoading(false);
      if (req && req.status === COURIER_STATUS.PENDING) {
        setSearching(true);
        startPolling();
      }
    })();
    return () => {
      stopPolling();
      stopLocationPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const req = await loadActive();
      if (!req || req.status !== COURIER_STATUS.PENDING) {
        setSearching(false);
        stopPolling();
      }
    }, 4000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

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
          setLiveLocation({ lat: data.lat, lng: data.lng, live: !!data.live });
        }
      } catch {
        // A missed poll isn't worth surfacing - the map keeps the last position.
      }
    },
    [getIdToken]
  );

  function stopLocationPolling() {
    if (locationPollRef.current) {
      clearInterval(locationPollRef.current);
      locationPollRef.current = null;
    }
  }

  function startLocationPolling(requestId: string) {
    stopLocationPolling();
    fetchLiveLocation(requestId);
    locationPollRef.current = setInterval(() => fetchLiveLocation(requestId), 6000);
  }

  // Track the courier's live position for the whole trackable stretch.
  useEffect(() => {
    if (active && TRACKABLE_STATUSES.includes(active.status)) {
      startLocationPolling(active._id);
    } else {
      stopLocationPolling();
      setLiveLocation(null);
    }
    return () => stopLocationPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?._id, active?.status]);

  // Keep the request's status fresh once a courier has accepted.
  useEffect(() => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    if (active && TRACKABLE_STATUSES.includes(active.status)) {
      statusPollRef.current = setInterval(() => {
        loadActive();
      }, 6000);
    }
    return () => {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?._id, active?.status]);

  // The "active" endpoint stops returning a request once it's delivered.
  // If a request that had a courier assigned disappears, show the success screen.
  useEffect(() => {
    const prev = prevActiveRef.current;
    if (!active && prev && TRACKABLE_STATUSES.includes(prev.status)) {
      setCompleted(prev);
      setChatOpen(false);
      setPayOpen(false);
    }
    prevActiveRef.current = active;
  }, [active]);

  // A new request starts with a clean payment state.
  useEffect(() => {
    setPaidOverride(null);
  }, [active?._id]);

  const chatEnabled = !!active && !!active.courierName && TRACKABLE_STATUSES.includes(active.status);
  const unread = useChatUnread(active?._id, "client", getIdToken, chatEnabled, chatOpen);

  function openBooking(vehicle: VehicleType | null = null) {
    setError(null);
    setPresetVehicle(vehicle);
    setCompleted(null);
    setSearchOpen(true);
  }

  async function handleConfirmRequest(data: {
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
    paymentMethod: PaymentMethod;
  }) {
    setError(null);
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("You need to be signed in to do that.");
      const res = await fetch("/api/courier-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pickup: data.pickup,
          dropoff: data.dropoff,
          note: data.note,
          pickupLat: data.pickupPlace.lat,
          pickupLng: data.pickupPlace.lng,
          dropoffLat: data.dropoffPlace.lat,
          dropoffLng: data.dropoffPlace.lng,
          receiverName: data.receiverName,
          receiverPhone: data.receiverPhone,
          pickupContactName: data.pickupContactName,
          pickupContactPhone: data.pickupContactPhone,
          vehicleType: data.vehicleType,
          paymentMethod: data.paymentMethod,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Couldn't send that request. Try again.");
      }

      setSearchOpen(false);
      setSearching(true);
      await loadActive();
      startPolling();
    } catch (err: any) {
      setError(err.message || "Couldn't send that request. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSearch() {
    stopPolling();
    setSearching(false);
    const cancellingId = active?._id;
    setActive(null);
    if (!cancellingId) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`/api/courier-requests/${cancellingId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        await loadActive();
      }
    } catch {
      await loadActive();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  const hasActiveRequest = !!active && active.status !== COURIER_STATUS.CANCELLED;
  const pickupCoords: LatLng | null =
    active?.pickupLat != null && active?.pickupLng != null
      ? { lat: active.pickupLat, lng: active.pickupLng }
      : null;
  const dropoffCoords: LatLng | null =
    active?.dropoffLat != null && active?.dropoffLng != null
      ? { lat: active.dropoffLat, lng: active.dropoffLng }
      : null;
  const contactRevealed = hasActiveRequest && active!.status !== COURIER_STATUS.PENDING;

  // Prefer the live-polled position; fall back to whatever Mongo had at
  // last load so the map never has nothing to show.
  const courierMapLocation: LatLng | null = hasActiveRequest
    ? liveLocation
      ? { lat: liveLocation.lat, lng: liveLocation.lng }
      : active!.courierLocation ?? null
    : null;

  const statusCopy = hasActiveRequest
    ? STATUS_COPY[active!.status] ?? { title: active!.status, sub: "" }
    : null;

  // --- Payment (direct rides only) ---
  const showPayment =
    hasActiveRequest &&
    active!.source !== "hub" &&
    typeof active!.totalFeeKobo === "number" &&
    active!.totalFeeKobo > 0;
  const totalFeeKobo = showPayment ? (active!.totalFeeKobo as number) : 0;
  const payMethod: PaymentMethod = active?.paymentMethod === "transfer" ? "transfer" : "cash";
  const payStatus =
    active?.paymentStatus === "collected"
      ? "collected"
      : paidOverride ?? active?.paymentStatus ?? "unpaid";
  const canPayNow =
    showPayment &&
    payMethod === "transfer" &&
    payStatus === "unpaid" &&
    !!active &&
    (active.status === COURIER_STATUS.PICKED_UP || active.status === COURIER_STATUS.EN_ROUTE);

  let payHint = "";
  if (showPayment) {
    if (payStatus === "collected") payHint = "Payment confirmed by your courier.";
    else if (payMethod === "cash") payHint = "Hand the cash to your courier when your package arrives.";
    else if (payStatus === "client_marked_paid") payHint = "Waiting for your courier to confirm.";
    else if (canPayNow) payHint = "Tap Pay now to see your courier's bank details.";
    else payHint = "You'll see your courier's bank details once your package is on its way.";
  }

  const HeaderIcon: ComponentType<{ className?: string }> =
    active?.vehicleType === "bicycle" ? Bike : active?.vehicleType === "cargo" ? Truck : MotorcycleIcon;

  return (
    <>
      {completed && !hasActiveRequest ? (
        /* ----------- Delivery successful ----------- */
        <div className="space-y-6 pt-6">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-sunshine">
              <PackageCheck className="h-12 w-12 text-brand" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold text-brand dark:text-white">
              Delivery successful!
            </h1>
            <p className="mt-2 max-w-xs text-sm text-steel">
              Your package has been delivered. Thank you for choosing Crafteey.
            </p>
          </div>

          <RouteSummary pickup={completed.pickup} dropoff={completed.dropoff} />

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => openBooking(null)}
              className="w-full rounded-2xl bg-brand-accent px-4 py-3.5 text-sm font-bold text-white shadow-card-lg transition hover:bg-brand-accentDark active:scale-[0.98]"
            >
              Book another delivery
            </button>
            <Link
              href="/dashboard/history"
              className="block w-full rounded-2xl border border-brand-accent px-4 py-3.5 text-center text-sm font-bold text-brand-accent transition hover:bg-brand-accent/5"
            >
              View details
            </Link>
          </div>
        </div>
      ) : hasActiveRequest ? (
        /* ----------- Active request / tracking ----------- */
        <div className="space-y-4">
          {/* Status header */}
          <div className="flex items-center gap-3 rounded-2xl border border-brand-accent/20 bg-brand-accent/5 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunshine text-brand">
              <HeaderIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-brand dark:text-white">{statusCopy!.title}</p>
              <p className="mt-0.5 text-xs text-steel">{statusCopy!.sub}</p>
            </div>
          </div>

          {/* Live map */}
          <div className="relative">
            <RouteMap
              pickup={pickupCoords}
              dropoff={dropoffCoords}
              courierLocation={courierMapLocation}
              stage={active!.status === COURIER_STATUS.ACCEPTED ? "to_pickup" : "to_dropoff"}
              className="h-[42vh] w-full rounded-2xl border border-slate-100 dark:border-slate-800"
            />
            {liveLocation?.live && TRACKABLE_STATUSES.includes(active!.status) && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Live
              </span>
            )}
          </div>

          {/* Courier card */}
          {contactRevealed && active!.courierName ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sunshine text-lg font-extrabold text-brand">
                  {active!.courierName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-brand dark:text-white">
                    {active!.courierName}
                  </p>
                  <p className="text-xs text-steel">
                    Your courier
                    {active!.vehicleType
                      ? ` \u2022 ${VEHICLE_LABEL[active!.vehicleType] ?? active!.vehicleType}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  aria-label={`Chat with ${active!.courierName}`}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent transition hover:bg-brand-accent/20"
                >
                  <MessageCircle className="h-5 w-5" />
                  {unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
                {active!.courierPhone && (
                  <a
                    href={`tel:${active!.courierPhone}`}
                    aria-label={`Call ${active!.courierName}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent transition hover:bg-brand-accent/20"
                  >
                    <Phone className="h-5 w-5" />
                  </a>
                )}
              </div>
              {TRACKABLE_STATUSES.includes(active!.status) && (
                <p className="mt-3 text-xs font-medium text-steel">
                  {liveLocation
                    ? liveLocation.live
                      ? "\uD83D\uDFE2 Live location"
                      : "Last known location - courier's connection may be spotty"
                    : "Waiting for courier's location..."}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-steel">Contact details appear once a courier accepts.</p>
            </div>
          )}

          {/* Payment card */}
          {showPayment && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunshine text-brand">
                  {payMethod === "transfer" ? (
                    <Landmark className="h-5 w-5" />
                  ) : (
                    <Banknote className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-brand dark:text-white">
                    {payMethod === "transfer" ? "Pay by bank transfer" : "Pay in cash"}
                  </p>
                  <p className="text-xs text-steel">{payHint}</p>
                </div>
                <p className="text-base font-extrabold text-brand dark:text-white">{naira(totalFeeKobo)}</p>
              </div>
              {payStatus === "collected" && (
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  <Check className="h-4 w-4" /> Payment received. Thank you!
                </p>
              )}
              {canPayNow && (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="mt-3 w-full rounded-xl bg-brand-accent py-3 text-sm font-bold text-white transition active:scale-[0.98]"
                >
                  Pay now
                </button>
              )}
              {payMethod === "transfer" && payStatus === "client_marked_paid" && (
                <p className="mt-3 rounded-xl bg-brand-accent/10 px-3 py-2 text-center text-xs font-semibold text-brand-accent">
                  Waiting for your courier to confirm your payment...
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 bg-white px-3 py-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <StatusStepper current={STATUS_STEP[active!.status] ?? 0} />
          </div>

          <RouteSummary pickup={active!.pickup} dropoff={active!.dropoff} />
        </div>
      ) : (
        /* ----------- Idle: choose a ride type ----------- */
        <div className="space-y-6">
          <BannerCarousel placement="rides" fallback={<RidesHeaderCard />} />

          <div>
            <p className="text-base font-bold text-brand dark:text-white">Choose your ride type</p>
            <p className="mb-3 mt-0.5 text-xs text-steel">Select the option that fits your needs.</p>
            <div className="space-y-3">
              {VEHICLE_CARDS.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => openBooking(v.key)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-card transition hover:shadow-card-lg active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sunshine text-brand">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-brand dark:text-white">
                        {v.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-steel">{v.desc}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        {v.chips.map((chip) => (
                          <span
                            key={chip}
                            className="rounded-full bg-brand-accent/10 px-2 py-0.5 text-[10px] font-semibold text-brand-accent"
                          >
                            {chip}
                          </span>
                        ))}
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-brand-accent" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-sm font-bold text-brand dark:text-slate-100">
              Delivery tips & safety
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Double-check the receiver's phone number - your courier
                  will call to confirm the drop-off.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Pick a pickup spot that's easy to find and reachable by
                  your chosen vehicle type.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Track your courier live once they accept, and only hand
                  off packages to the courier shown in the app.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {searchOpen && (
        <AddressSearchOverlay
          error={error}
          submitting={submitting}
          defaultVehicleType={presetVehicle}
          onClose={() => setSearchOpen(false)}
          onConfirm={handleConfirmRequest}
        />
      )}

      {searching && (
        <SearchingOverlay pickup={pickupCoords} dropoff={dropoffCoords} onCancel={handleCancelSearch} />
      )}

      {chatOpen && chatEnabled && active && (
        <ChatSheet
          requestId={active._id}
          role="client"
          title={active.courierName ?? "Your courier"}
          subtitle="Delivery chat"
          getIdToken={getIdToken}
          onClose={() => setChatOpen(false)}
        />
      )}

      {payOpen && showPayment && active && (
        <PayNowSheet
          requestId={active._id}
          amountKobo={totalFeeKobo}
          paymentStatus={payStatus}
          riderAppUrl={RIDER_APP_URL}
          getIdToken={getIdToken}
          onClose={() => setPayOpen(false)}
          onMarkedPaid={() => {
            setPaidOverride("client_marked_paid");
            loadActive();
          }}
        />
      )}
    </>
  );
}