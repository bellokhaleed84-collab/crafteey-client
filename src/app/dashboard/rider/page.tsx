"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { COURIER_STATUS } from "@/lib/constants";
import { type PlaceResult } from "@/components/map/MapboxAddressInput";
import RouteMap, { type LatLng } from "@/components/map/RouteMap";
import SearchingOverlay from "@/components/map/SearchingOverlay";
import AddressSearchOverlay from "@/components/map/AddressSearchOverlay";

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
  courierName: string | null;
  courierPhone: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  [COURIER_STATUS.PENDING]: "Finding a courier",
  [COURIER_STATUS.ACCEPTED]: "Courier assigned",
  [COURIER_STATUS.PICKED_UP]: "Picked up",
  [COURIER_STATUS.EN_ROUTE]: "On the way",
  [COURIER_STATUS.DELIVERED]: "Delivered",
  [COURIER_STATUS.CANCELLED]: "Cancelled",
};

// Once a courier is assigned and actually en route, this is when live
// tracking matters — before that (PENDING) there's no courier to track yet.
// Typed as string[] explicitly — without this, TypeScript narrows the
// array to the literal union of the specific COURIER_STATUS values, and
// .includes() on a literal-typed array rejects the plain `string` type of
// active.status, which is what caused the earlier type error.
const TRACKABLE_STATUSES: string[] = [
  COURIER_STATUS.ACCEPTED,
  COURIER_STATUS.PICKED_UP,
  COURIER_STATUS.EN_ROUTE,
];

// crafteey-rider is a separate deployment — this is a cross-origin call.
const RIDER_APP_URL = process.env.NEXT_PUBLIC_RIDER_APP_URL ?? "";

export default function RiderPage() {
  const { getIdToken } = useAuth();
  const [active, setActive] = useState<CourierRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Separate from `active.courierLocation` (Mongo's last-known value,
  // fetched once) — this holds whatever crafteey-rider's live endpoint
  // most recently returned, refreshed on its own timer during a delivery.
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; live: boolean } | null>(
    null
  );

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      // network hiccup — keep polling, don't surface an error mid-search
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
        // A missed poll isn't worth surfacing — the map just keeps
        // showing the last position it has until the next one succeeds.
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

  // This is the actual fix: track the courier's live position for the
  // whole trackable stretch of the delivery, not just while searching.
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

  async function handleConfirmRequest(data: {
    pickup: string;
    dropoff: string;
    note: string;
    pickupPlace: PlaceResult;
    dropoffPlace: PlaceResult;
    // New — collected by AddressSearchOverlay once it has the receiver
    // and (optional) pickup-contact fields added to it.
    receiverName: string;
    receiverPhone: string;
    pickupContactName?: string;
    pickupContactPhone?: string;
    vehicleType: "bicycle" | "motorcycle" | "cargo";
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

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>;

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
  // last load (e.g. the instant right after acceptance, before the first
  // live poll has resolved) so the map never has nothing to show.
  const courierMapLocation: LatLng | null = hasActiveRequest
    ? liveLocation
      ? { lat: liveLocation.lat, lng: liveLocation.lng }
      : active!.courierLocation ?? null
    : null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <RouteMap
          pickup={hasActiveRequest ? pickupCoords : null}
          dropoff={hasActiveRequest ? dropoffCoords : null}
          courierLocation={courierMapLocation}
          className="h-[50vh] w-full rounded-2xl border border-slate-100 dark:border-slate-800"
        />
        {!hasActiveRequest && (
          <button
            onClick={() => setSearchOpen(true)}
            className="absolute inset-x-4 top-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-500 shadow-lg backdrop-blur transition hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <Search className="h-4 w-4" />
            Where to?
          </button>
        )}
      </div>

      {hasActiveRequest && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {STATUS_LABEL[active!.status] ?? active!.status}
          </span>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Pickup</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{active!.pickup}</p>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Drop-off</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{active!.dropoff}</p>

          {contactRevealed && active!.courierName ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-500 dark:text-slate-400">Your courier</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">{active!.courierName}</p>
              {active!.courierPhone && (
                <a
                  href={`tel:${active!.courierPhone}`}
                  className="mt-2 inline-block text-sm font-semibold text-brand underline underline-offset-2 dark:text-brand-accent"
                >
                  Call {active!.courierPhone}
                </a>
              )}
              {TRACKABLE_STATUSES.includes(active!.status) && (
                <p className="mt-3 text-xs font-medium text-slate-400">
                  {liveLocation
                    ? liveLocation.live
                      ? "🟢 Live location"
                      : "Last known location — courier's connection may be spotty"
                    : "Waiting for courier's location…"}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
              Contact details appear once a courier accepts.
            </p>
          )}
        </div>
      )}

      {searchOpen && (
        <AddressSearchOverlay
          error={error}
          onClose={() => setSearchOpen(false)}
          onConfirm={handleConfirmRequest}
        />
      )}
      {searching && <SearchingOverlay onCancel={handleCancelSearch} />}
    </div>
  );
}