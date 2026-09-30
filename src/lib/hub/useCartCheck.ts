"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useHubApi } from "@/lib/hub/useHubApi";

type CheckResponse = {
  vendor: { _id: string; name: string; isOpen: boolean } | null;
  items: { productId: string; name: string; priceKobo: number; isAvailable: boolean; stock: number | null }[];
};

export interface LiveItem {
  livePriceKobo: number;
  priceChanged: boolean;
  issue: string | null; // why this item can't be ordered right now
  removable: boolean; // true = item is gone/unavailable; false = fixable by lowering quantity
}

/**
 * Live state of the cart: current prices, availability, and whether the store
 * is open. Stored carts keep the price from when the item was added, so this is
 * what the customer should see. The server re-checks everything at order time.
 */
export function useCartCheck() {
  const { items, hydrated } = useCart();
  const api = useHubApi();
  const [data, setData] = useState<CheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const seq = useRef(0);

  const idsKey = useMemo(() => items.map((i) => i.productId).sort().join(","), [items]);

  const refresh = useCallback(async () => {
    if (!idsKey) return;
    const mine = ++seq.current;
    setChecking(true);
    try {
      const r = await api<CheckResponse>("/api/hub/cart-check", {
        method: "POST",
        body: JSON.stringify({ productIds: idsKey.split(",") }),
      });
      if (mine !== seq.current) return; // a newer check superseded this one
      setData(r);
      setCheckFailed(false);
    } catch {
      if (mine !== seq.current) return;
      setCheckFailed(true);
    } finally {
      if (mine === seq.current) setChecking(false);
    }
  }, [api, idsKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (!idsKey) {
      setData(null);
      return;
    }
    refresh();
  }, [hydrated, idsKey, refresh]);

  // Re-check when the customer comes back to a tab that's been open a while.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return useMemo(() => {
    const live = new Map<string, CheckResponse["items"][number]>();
    data?.items.forEach((i) => live.set(i.productId, i));

    const byProduct: Record<string, LiveItem> = {};
    let liveSubtotalKobo = 0;
    let anyPriceChanged = false;
    const removableIds: string[] = [];
    let anyIssue = false;

    for (const item of items) {
      const l = live.get(item.productId);
      let issue: string | null = null;
      let removable = false;

      if (data) {
        if (!l) {
          issue = "No longer available";
          removable = true;
        } else if (!l.isAvailable) {
          issue = "Currently unavailable";
          removable = true;
        } else if (l.stock !== null && l.stock < item.quantity) {
          if (l.stock <= 0) {
            issue = "Sold out";
            removable = true;
          } else {
            issue = `Only ${l.stock} left`;
          }
        }
      }

      const livePriceKobo = l ? l.priceKobo : item.priceKobo;
      const priceChanged = Boolean(l) && l!.priceKobo !== item.priceKobo;
      if (priceChanged) anyPriceChanged = true;
      if (issue) anyIssue = true;
      if (removable) removableIds.push(item.productId);

      byProduct[item.productId] = { livePriceKobo, priceChanged, issue, removable };
      liveSubtotalKobo += livePriceKobo * item.quantity;
    }

    const storeClosed = data?.vendor ? !data.vendor.isOpen : false;

    return {
      checking,
      checkFailed,
      storeClosed,
      byProduct,
      liveSubtotalKobo,
      anyPriceChanged,
      removableIds,
      hasBlockingIssue: storeClosed || anyIssue,
      refresh,
    };
  }, [data, items, checking, checkFailed, refresh]);
}