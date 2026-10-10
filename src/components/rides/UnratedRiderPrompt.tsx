"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { authedFetch } from "@/lib/chatApi";
import RiderRatingCard from "@/components/rides/RiderRatingCard";

type Unrated = { _id: string; courierName: string | null; pickup: string; dropoff: string };

// Shows the newest recent delivery that has no rating yet, so a forgotten one can still be rated.
export default function UnratedRiderPrompt() {
  const { getIdToken } = useAuth();
  const [req, setReq] = useState<Unrated | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(getIdToken, "/api/courier-requests/unrated");
        const data = await res.json().catch(() => null);
        if (!res.ok || cancelled) return;
        setReq(data?.request ?? null);
      } catch {
        // not important enough to show an error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken]);

  if (!req || hidden) return null;

  return (
    <div className="space-y-2">
      <p className="truncate text-xs text-steel">
        Your last delivery: {req.pickup} {"\u2192"} {req.dropoff}
      </p>
      <RiderRatingCard requestId={req._id} riderName={req.courierName} onDismiss={() => setHidden(true)} />
    </div>
  );
}