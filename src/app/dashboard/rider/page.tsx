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

export default function RiderPage() {
  const { getIdToken } = useAuth();
  const [active, setActive] = useState<CourierRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    return () => stopPolling();
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

  async function handleConfirmRequest(data: {
    pickup: string;
    dropoff: string;
    note: string;
    pickupPlace: PlaceResult;
    dropoffPlace: PlaceResult;
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
        }),
      });
      if (!res.ok) {
        // Surface the server's real reason (e.g. "You already have an
        // active request") instead of always falling back to a generic
        // message that hides what actually went wrong.
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
    // Clear immediately so the "Finding a courier" card disappears the
    // instant the user cancels, instead of sitting there until the
    // network round trip to /cancel and the follow-up loadActive() both
    // resolve. If the cancel turns out to have failed server-side, we
    // reconcile below by reloading the real state instead of leaving the
    // UI claiming there's no active request when there still is one.
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

  // Single source of truth for what the map shows, whether or not there's
  // an active request. Previously this component returned two entirely
  // separate JSX trees (one per branch below), each with its own <RouteMap>
  // element. React treats those as different elements and unmounts the old
  // one / mounts a new one whenever `active` flips from null to populated
  // (which happens almost immediately after mount, once loadActive()
  // resolves) — a real remount stacked right on top of React Strict Mode's
  // dev-only double mount/unmount/mount cycle. Rendering exactly one
  // <RouteMap> below and only changing its props avoids that extra
  // teardown/recreate race entirely.
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

  return (
    <div className="space-y-4">
      <div className="relative">
        <RouteMap
          pickup={hasActiveRequest ? pickupCoords : null}
          dropoff={hasActiveRequest ? dropoffCoords : null}
          courierLocation={hasActiveRequest ? active!.courierLocation ?? null : null}
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