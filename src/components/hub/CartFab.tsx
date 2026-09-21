"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";

const SIZE = 56;
const EDGE = 12;
const TOP_MIN = 72;
const BOTTOM_GAP = 92; // keeps it above the bottom nav
const STORAGE_KEY = "crafteey_hub_cart_fab_v1";
const CART_URL = "/dashboard/hub/cart";

type Side = "left" | "right";

/**
 * Floating cart button. Tap = open cart. Drag it anywhere up/down (or to the other side);
 * it snaps to the nearest edge and remembers where you left it.
 */
export default function CartFab() {
  const { count } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [side, setSide] = useState<Side>("right");
  const [y, setY] = useState(0);
  const [dragX, setDragX] = useState<number | null>(null);
  const [, rerender] = useState(0);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  const clampY = (v: number) =>
    Math.min(Math.max(v, TOP_MIN), Math.max(TOP_MIN, window.innerHeight - BOTTOM_GAP - SIZE));
  const edgeX = (s: Side) => (s === "right" ? window.innerWidth - SIZE - EDGE : EDGE);

  useEffect(() => {
    let s: Side = "right";
    let startY = window.innerHeight - BOTTOM_GAP - SIZE - 16;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.side === "left" || p.side === "right") s = p.side;
        if (typeof p.y === "number") startY = p.y;
      }
    } catch {
      /* ignore */
    }
    setSide(s);
    setY(clampY(startY));
    setMounted(true);

    const onResize = () => {
      setY((prev) => clampY(prev));
      rerender((n) => n + 1);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || pathname.startsWith("/dashboard/hub/cart") || pathname.startsWith("/dashboard/hub/checkout")) {
    return null;
  }

  function save(nextSide: Side, nextY: number) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ side: nextSide, y: nextY }));
    } catch {
      /* ignore */
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: dragX ?? edgeX(side), oy: y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 6) return; // small wiggles still count as a tap
    d.moved = true;
    setDragX(Math.min(Math.max(d.ox + dx, 0), window.innerWidth - SIZE));
    setY(clampY(d.oy + dy));
  }

  function finish(openCart: boolean) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      const centre = (dragX ?? edgeX(side)) + SIZE / 2;
      const nextSide: Side = centre < window.innerWidth / 2 ? "left" : "right";
      setSide(nextSide);
      setDragX(null);
      save(nextSide, y);
    } else if (openCart) {
      router.push(CART_URL);
    }
  }

  return (
    <button
      type="button"
      aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}. Drag to move.`}
      title="Drag to move"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => finish(true)}
      onPointerCancel={() => finish(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(CART_URL);
        }
      }}
      style={{
        left: dragX ?? edgeX(side),
        top: y,
        width: SIZE,
        height: SIZE,
        transition: dragX === null ? "left .2s ease, top .2s ease" : "none",
      }}
      className="fixed z-40 flex touch-none select-none items-center justify-center rounded-full bg-sunshine text-2xl shadow-card ring-4 ring-white/70 active:scale-95"
    >
      <span aria-hidden>🛒</span>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
