"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import RouteMap, { type LatLng } from "@/components/map/RouteMap";

interface SearchingOverlayProps {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onCancel: () => void;
}

const STATUS_MESSAGES = [
  "Looking for couriers nearby…",
  "Checking who's online…",
  "Matching you with a courier…",
];

export default function SearchingOverlay({ pickup, dropoff, onCancel }: SearchingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col">
      {/* Map fills the top portion, behind the sheet */}
      <div className="relative flex-1">
        <RouteMap pickup={pickup} dropoff={dropoff} courierLocation={null} className="h-full w-full" />
      </div>

      {/* Bottom sheet — roughly half the screen */}
      <div className="relative z-10 flex flex-col items-center gap-5 rounded-t-3xl bg-white/95 px-6 pb-8 pt-7 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur dark:bg-slate-950/95">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <span className="absolute h-full w-full animate-radar-ping rounded-full bg-brand-accent/20" />
          <span
            className="absolute h-full w-full animate-radar-ping rounded-full bg-brand-accent/20"
            style={{ animationDelay: "0.8s" }}
          />
          <span
            className="absolute h-full w-full animate-radar-ping rounded-full bg-brand-accent/20"
            style={{ animationDelay: "1.6s" }}
          />
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-brand-accent text-white shadow-lg">
            <MapPin className="h-5 w-5" />
          </span>
        </div>

        <div className="text-center">
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            Finding a courier
          </p>
          <p className="mt-1 min-h-[20px] text-sm text-slate-500 transition-opacity dark:text-slate-400">
            {STATUS_MESSAGES[messageIndex]}
          </p>
        </div>

        <button
          onClick={onCancel}
          className="w-full max-w-xs rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>

      <style jsx global>{`
        @keyframes radar-ping {
          0% {
            transform: scale(0.4);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        .animate-radar-ping {
          animation: radar-ping 2.4s ease-out infinite;
        }
      `}</style>
    </div>
  );
}