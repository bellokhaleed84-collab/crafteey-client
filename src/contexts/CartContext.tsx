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

export interface CartItem {
  productId: string;
  name: string;
  priceKobo: number;
  imageUrl?: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
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
  quantityOf: (productId: string) => number;
  addItem: (item: Omit<CartItem, "quantity">) => AddResult;
  replaceWith: (item: Omit<CartItem, "quantity">) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
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

  // load
  useEffect(() => {
    if (!storageKey) return;
    setHydrated(false);
    try {
      const raw = localStorage.getItem(storageKey);
      setItems(raw ? (JSON.parse(raw) as CartItem[]) : []);
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
      /* storage unavailable — cart just won't persist */
    }
  }, [items, hydrated, storageKey]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">): AddResult => {
    const current = itemsRef.current;
    // one vendor per order
    if (current.length > 0 && current[0].vendorId !== item.vendorId) {
      return { ok: false, reason: "different_vendor", currentVendorName: current[0].vendorName };
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QTY) } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    return { ok: true };
  }, []);

  const replaceWith = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems([{ ...item, quantity: 1 }]);
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, MAX_QTY) } : i))
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextType>(() => {
    const subtotalKobo = items.reduce((s, i) => s + i.priceKobo * i.quantity, 0);
    return {
      items,
      hydrated,
      count: items.reduce((s, i) => s + i.quantity, 0),
      vendorId: items[0]?.vendorId ?? null,
      vendorName: items[0]?.vendorName ?? null,
      subtotalKobo,
      deliveryFeeKobo: items.length ? DELIVERY_FEE_KOBO : 0,
      totalKobo: items.length ? subtotalKobo + DELIVERY_FEE_KOBO : 0,
      quantityOf: (id) => items.find((i) => i.productId === id)?.quantity ?? 0,
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
