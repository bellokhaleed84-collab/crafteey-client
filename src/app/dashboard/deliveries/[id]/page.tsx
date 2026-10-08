"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Phone, Package, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { COURIER_STATUS } from "@/lib/constants";
import { DetailSkeleton } from "@/components/ui/Skeleton";

interface Delivery {
  _id: string;
  pickup: string;
  dropoff: string;
  note: string;
  status: string;
  vehicleType?: string;
  receiverName: string;
  receiverPhone: string;
  pickupContactName: string;
  pickupContactPhone: string;
  source?: "direct" | "hub";
  orderNumber?: string | null;
  vendorName?: string;
  courierName: string | null;
  courierPhone: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  [COURIER_STATUS.PENDING]: "Finding a courier",
  [COURIER_STATUS.ACCEPTED]: "Courier assigned",
  [COURIER_STATUS.PICKED_UP]: "Picked up",
  [COURIER_STATUS.EN_ROUTE]: "On the way",
  [COURIER_STATUS.DELIVERED]: "Delivered",
  [COURIER_STATUS.CANCELLED]: "Cancelled",
};

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: "Bicycle",
  motorcycle: "Motorcycle",
  cargo: "Cargo",
};

function badgeClass(status: string) {
  if (status === COURIER_STATUS.DELIVERED) return "bg-emerald-50 text-emerald-700";
  if (status === COURIER_STATUS.CANCELLED) return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

function formatTime(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const CARD =
  "rounded-2xl border border-slate-100 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900";
const LABEL = "text-[11px] font-semibold uppercase tracking-wide text-steel";

function CallButton({ phone, label }: { phone: string; label: string }) {
  return (
    <a
      href={`tel:${phone}`}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent transition hover:bg-brand-accent/20"
    >
      <Phone className="h-4 w-4" />
    </a>
  );
}

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getIdToken } = useAuth();
  const [data, setData] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/courier-requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("not found");
      const json = await res.json();
      setData(json.request);
      setError(null);
    } catch {
      setError("Couldn't load this delivery.");
    } finally {
      setLoading(false);
    }
  }, [id, getIdToken]);

  useEffect(() => {
    load();
  }, [load]);

  const status = data?.status;
  const finished = status === COURIER_STATUS.DELIVERED || status === COURIER_STATUS.CANCELLED;

  // Keep an unfinished delivery up to date.
  useEffect(() => {
    if (!status || finished) return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [status, finished, load]);

  if (loading) return <DetailSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/history" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Delivery not found."}</p>
      </div>
    );
  }

  const cancelled = data.status === COURIER_STATUS.CANCELLED;
  const delivered = data.status === COURIER_STATUS.DELIVERED;
  const hasCourier = !!data.courierName;

  const timeline: { label: string; at: string | null }[] = cancelled
    ? [
        { label: "Requested", at: data.createdAt },
        { label: "Cancelled", at: data.updatedAt },
      ]
    : [
        { label: "Requested", at: data.createdAt },
        { label: "Courier accepted", at: data.acceptedAt ?? null },
        { label: "Picked up", at: data.pickedUpAt ?? null },
        { label: "Delivered", at: data.deliveredAt ?? (delivered ? data.updatedAt : null) },
      ];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/history" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-accent">
        <ArrowLeft className="h-4 w-4" /> Back to history
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-brand dark:text-white">
            {data.source === "hub" ? "Hub order delivery" : "Courier delivery"}
          </h1>
          <p className="mt-0.5 text-xs text-steel">
            {data.vehicleType ? VEHICLE_LABEL[data.vehicleType] ?? data.vehicleType : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass(data.status)}`}>
          {STATUS_LABEL[data.status] ?? data.status}
        </span>
      </div>

      {data.source === "hub" && (data.vendorName || data.orderNumber) && (
        <div className={`${CARD} flex items-center gap-3`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunshine text-brand">
            <Store className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            {data.vendorName && <p className="truncate text-sm font-bold text-brand dark:text-white">{data.vendorName}</p>}
            {data.orderNumber && <p className="text-xs text-steel">Order {data.orderNumber}</p>}
          </div>
        </div>
      )}

      {/* Route */}
      <div className={CARD}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="my-1 h-16 w-px bg-slate-200 dark:bg-slate-700" />
            <span className="h-3 w-3 rounded-full bg-brand-accent" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className={LABEL}>Pickup</p>
              <p className="text-sm font-semibold text-brand dark:text-slate-100">{data.pickup}</p>
              {data.pickupContactName && (
                <p className="mt-0.5 text-xs text-steel">
                  {data.pickupContactName}
                  {data.pickupContactPhone ? `, ${data.pickupContactPhone}` : ""}
                </p>
              )}
            </div>
            <div>
              <p className={LABEL}>Drop-off</p>
              <p className="text-sm font-semibold text-brand dark:text-slate-100">{data.dropoff}</p>
              {data.receiverName && (
                <p className="mt-0.5 text-xs text-steel">
                  Receiver: {data.receiverName}
                  {data.receiverPhone ? `, ${data.receiverPhone}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Courier */}
      {hasCourier ? (
        <div className={`${CARD} flex items-center gap-3`}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sunshine text-lg font-extrabold text-brand">
            {data.courierName!.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-brand dark:text-white">{data.courierName}</p>
            <p className="text-xs text-steel">
              Your courier
              {data.courierPhone ? `, ${data.courierPhone}` : ""}
            </p>
          </div>
          {data.courierPhone && <CallButton phone={data.courierPhone} label={`Call ${data.courierName}`} />}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-steel dark:border-slate-700 dark:bg-slate-900">
          {cancelled ? "No courier was assigned." : "Courier details appear once a courier accepts."}
        </div>
      )}

      {/* Timeline */}
      <div className={CARD}>
        <p className="mb-3 text-sm font-bold text-brand dark:text-white">Timeline</p>
        <ul className="space-y-3">
          {timeline.map((step) => {
            const when = formatTime(step.at);
            return (
              <li key={step.label} className="flex items-start gap-3">
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
                    when ? "bg-brand-accent" : "border-2 border-slate-300 dark:border-slate-600"
                  }`}
                />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${when ? "text-brand dark:text-white" : "text-steel"}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-steel">{when ?? "Not recorded"}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {data.note && (
        <div className={CARD}>
          <p className={LABEL}>
            <Package className="mr-1 inline h-3.5 w-3.5" />
            Note to courier
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{data.note}</p>
        </div>
      )}
    </div>
  );
}