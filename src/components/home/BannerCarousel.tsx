"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import BannerSlideView, { type BannerView } from "@/components/BannerSlideView";

interface PublicBanner extends BannerView {
  id: string;
  link: string;
}

const AUTO_MS = 4500;
const PAUSE_MS = 6000;

function StaticPromo() {
  return (
    <div className="rounded-2xl bg-brand px-5 py-4 text-white shadow-card-lg dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-slate-800">
      <p className="text-sm font-bold">Safe. Fast. Reliable.</p>
      <p className="mt-1 text-xs text-white/80">Whatever you need, Crafteey delivers.</p>
    </div>
  );
}

function Slide({ banner }: { banner: PublicBanner }) {
  const inner = <BannerSlideView banner={banner} />;
  const cls = "block w-full shrink-0 snap-center";

  if (!banner.link) return <div className={cls}>{inner}</div>;

  if (banner.link.startsWith("/")) {
    return (
      <Link href={banner.link} className={cls} draggable={false}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={banner.link} target="_blank" rel="noopener noreferrer" className={cls} draggable={false}>
      {inner}
    </a>
  );
}

export default function BannerCarousel({
  placement = "home",
  fallback,
}: {
  placement?: "home" | "hub";
  fallback?: ReactNode;
}) {
  const [banners, setBanners] = useState<PublicBanner[] | null>(null);
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/banners?placement=${placement}`, { cache: "no-store" });
        const d = await res.json().catch(() => ({}));
        if (!cancelled) setBanners(res.ok && Array.isArray(d.banners) ? d.banners : []);
      } catch {
        if (!cancelled) setBanners([]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [placement]);

  const count = banners?.length ?? 0;

  const goTo = useCallback((i: number) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  // Auto-advance, looping. Skips while the page is hidden or just after a touch.
  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - lastTouch.current < PAUSE_MS) return;
      const el = trackRef.current;
      if (!el || !el.clientWidth) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      goTo((current + 1) % count);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [count, goTo]);

  function onScroll() {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function markTouch() {
    lastTouch.current = Date.now();
  }

  if (banners === null) {
    return (
      <div
        className="w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
        style={{ aspectRatio: "2 / 1" }}
        aria-busy="true"
      />
    );
  }

  if (banners.length === 0) return <>{fallback ?? <StaticPromo />}</>;

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={markTouch}
        onTouchMove={markTouch}
        onTouchEnd={markTouch}
        onPointerDown={markTouch}
        onWheel={markTouch}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b) => (
          <Slide key={b.id} banner={b} />
        ))}
      </div>

      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Show banner ${i + 1}`}
              onClick={() => {
                markTouch();
                goTo(i);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-brand dark:bg-white" : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}