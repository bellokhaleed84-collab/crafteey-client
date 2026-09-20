"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Heart, SlidersHorizontal } from "lucide-react";

const CATEGORIES = ["All", "Local", "Fast Food", "Drinks", "Desserts"];

const RESTAURANTS = [
  { name: "Buka Zone", tag: "Nigerian • Fast Food", rating: 4.6, reviews: "1.2k+", eta: "30-40 mins", emoji: "🍛" },
  { name: "Burger House", tag: "Burgers • Fast Food", rating: 4.5, reviews: "980+", eta: "25-35 mins", emoji: "🍔" },
  { name: "Suya Spot", tag: "Nigerian • Local", rating: 4.7, reviews: "760+", eta: "20-30 mins", emoji: "🍢" },
];

export default function HubPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back" className="text-brand">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold text-brand">Food</h1>
      </div>
      <p className="-mt-3 text-xs text-steel">📍 Lagos, Nigeria</p>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card">
          <Search className="h-4 w-4 text-steel" />
          <input
            type="text"
            placeholder="Search for restaurants or dishes…"
            className="w-full bg-transparent text-sm text-brand outline-none placeholder:text-steel"
          />
        </div>
        <button
          type="button"
          aria-label="Filter"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sunshine text-brand"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-2xl bg-sunshine p-5">
        <p className="text-base font-extrabold text-brand">Good Food, Great Mood</p>
        <p className="mt-1 text-xs font-medium text-brand/70">Fresh meals, fast delivery</p>
      </div>

      <div className="flex gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
              activeCategory === cat ? "bg-sunshine text-brand" : "bg-white text-steel shadow-card"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-brand">Popular Restaurants</p>
          <span className="text-xs font-semibold text-brand-accent">See all</span>
        </div>
        <div className="space-y-3">
          {RESTAURANTS.map((r) => (
            <div key={r.name} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-3xl">
                {r.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm font-bold text-brand">{r.name}</p>
                  <Heart className="h-4 w-4 shrink-0 text-red-400" />
                </div>
                <p className="text-xs text-steel">{r.tag}</p>
                <p className="mt-1 text-xs text-steel">
                  ⭐ {r.rating} ({r.reviews}) · {r.eta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Honest about status — this is a visual preview only, nothing here
          is wired to a real backend, cart, or checkout yet. */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-steel">
          Crafteey Hub is coming soon — this is a preview of what food &amp; marketplace ordering will look like.
        </p>
      </div>
    </div>
  );
}