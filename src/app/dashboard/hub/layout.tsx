"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/contexts/CartContext";
import CartBar from "@/components/hub/CartBar";

export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartBar />
    </CartProvider>
  );
}
