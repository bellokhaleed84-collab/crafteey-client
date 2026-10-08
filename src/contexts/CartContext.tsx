"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DELIVERY_FEE_KOBO } from "@/lib/hub/config";
import { lineIdFor, type PickedOption, type Selection } from "@/lib/hub/options";

export interface CartItem {
  /** One cart line = one food with one set of options. Same as productId when there are no options. */
  lineId: string;
  productId: string;
  name: string;
  /** base price of one plate */
  priceKobo: number;
  /** extras added to one plate, in kobo */
  optionsKobo?: number;
  selections?: Selection[];
  /** names of the extras picked, for showing in the cart */
  picked?: PickedOption[];
  imageUrl?: string;
  emoji?: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
}

export type NewCartItem = Omit<CartItem, "quantity" | "lineId">;

/** Price of one plate including its extras. */
export function unitPriceOf(i: { priceKobo: number; optionsKobo?: number }): number {
  return i.priceKobo + (i.optionsKobo ?? 0);
}

export type AddResult = { ok: true } | { ok: false; reason: "different_vendor"; currentVendorName: string };

interface CartContextType {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  vendorId: string | null;
  vendorName: string | null;
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  /** total plates of this product across all its lines */
  quantityOf: (productId: string) => number;
  addItem: (item: NewCartItem, quantity?: number) => AddResult;
  replaceWith: (item: NewCartItem, quantity?: number) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const MAX_QTY = 50;

export function CartProvider({ children }: { children: ReactNode }) {
  const { client } = useAuth();
  const storageKey = client ? `crafteey_hub_cart_${client._id}` : null;

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // load (older saved carts have no lineId, so give them one)
  useEffect(() => {
    if (!storageKey) return;
    setHydrated(false);
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Partial<CartItem>[]) : [];
      setItems(
        parsed
          .filter((i) => i && typeof i.productId === "string")
          .map((i) => ({ ...(i as CartItem), lineId: i.lineId ?? (i.productId as string) }))
      );
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, [storageKey]);

  // save
  useEffect(() => {
    if (!hydrated || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* storage unavailable - cart just won't persist */
    }
  }, [items, hydrated, storageKey]);

  const addItem = useCallback((item: NewCartItem, quantity = 1): AddResult => {
    const current = itemsRef.current;
    // one vendor per order
    if (current.length > 0 && current[0].vendorId !== item.vendorId) {
      return { ok: false, reason: "different_vendor", currentVendorName: current[0].vendorName };
    }
    const lineId = lineIdFor(item.productId, item.selections);
    const add = Math.max(1, Math.floor(quantity));
    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId);
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: Math.min(i.quantity + add, MAX_QTY) } : i
        );
      }
      return [...prev, { ...item, lineId, quantity: Math.min(add, MAX_QTY) }];
    });
    return { ok: true };
  }, []);

  const replaceWith = useCallback((item: NewCartItem, quantity = 1) => {
    const lineId = lineIdFor(item.productId, item.selections);
    setItems([{ ...item, lineId, quantity: Math.min(Math.max(1, Math.floor(quantity)), MAX_QTY) }]);
  }, []);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.lineId !== lineId)
        : prev.map((i) => (i.lineId === lineId ? { ...i, quantity: Math.min(quantity, MAX_QTY) } : i))
    );
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextType>(() => {
    const subtotalKobo = items.reduce((s, i) => s + unitPriceOf(i) * i.quantity, 0);
    return {
      items,
      hydrated,
      count: items.reduce((s, i) => s + i.quantity, 0),
      vendorId: items[0]?.vendorId ?? null,
      vendorName: items[0]?.vendorName ?? null,
      subtotalKobo,
      deliveryFeeKobo: items.length ? DELIVERY_FEE_KOBO : 0,
      totalKobo: items.length ? subtotalKobo + DELIVERY_FEE_KOBO : 0,
      quantityOf: (productId) =>
        items.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0),
      addItem,
      replaceWith,
      setQuantity,
      removeItem,
      clear,
    };
  }, [items, hydrated, addItem, replaceWith, setQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}