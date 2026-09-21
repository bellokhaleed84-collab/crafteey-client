"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/contexts/CartContext";
import CartFab from "@/components/hub/CartFab";

export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartFab />
    </CartProvider>
  );
}
