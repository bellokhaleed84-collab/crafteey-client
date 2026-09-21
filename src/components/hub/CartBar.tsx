"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatNaira } from "@/lib/hub/config";

/** Floating "View cart" bar, sits above the bottom nav. */
export default function CartBar() {
  const { count, subtotalKobo } = useCart();
  const pathname = usePathname();

  const hidden = pathname.startsWith("/dashboard/hub/cart") || pathname.startsWith("/dashboard/hub/checkout");
  if (count === 0 || hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 mx-auto max-w-2xl px-6">
      <Link
        href="/dashboard/hub/cart"
        className="pointer-events-auto flex items-center justify-between rounded-2xl bg-brand px-4 py-3 text-white shadow-lg"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="h-4 w-4" />
          View cart · {count} {count === 1 ? "item" : "items"}
        </span>
        <span className="text-sm font-bold">{formatNaira(subtotalKobo)}</span>
      </Link>
    </div>
  );
}
