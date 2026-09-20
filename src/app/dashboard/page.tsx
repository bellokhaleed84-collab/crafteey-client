"use client";

import Link from "next/link";
import { Bell, MapPin, Search, UtensilsCrossed, Car, Wrench, History as HistoryIcon, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SERVICES = [
  {
    key: "hub",
    label: "Crafteey Hub",
    sub: "Food, groceries & more",
    href: "/dashboard/hub",
    icon: UtensilsCrossed,
    tone: "bg-sunshine/20 text-sunshine-dark",
  },
  {
    key: "rides",
    label: "Rides",
    sub: "Book a ride or cargo",
    href: "/dashboard/rider",
    icon: Car,
    tone: "bg-brand-accent/10 text-brand-accent",
  },
  {
    key: "technicians",
    label: "Technicians",
    sub: "Book a trusted pro",
    href: "/dashboard/technicians",
    icon: Wrench,
    tone: "bg-brand/10 text-brand",
  },
  {
    key: "history",
    label: "History",
    sub: "Past orders & bookings",
    href: "/dashboard/history",
    icon: HistoryIcon,
    tone: "bg-slate-200/70 text-slate-600",
  },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardHomePage() {
  const { client } = useAuth();
  const firstName = client?.name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {/* Header / hero */}
      <div className="rounded-3xl bg-sunshine px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <span className="text-lg font-extrabold text-brand">Crafteey</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-brand"
            >
              <Bell className="h-4 w-4" />
            </button>
            <Link
              href="/dashboard/settings/profile"
              aria-label="Your profile"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/70 text-sm font-bold text-brand"
            >
              {firstName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>

        <h1 className="mt-4 text-xl font-extrabold text-brand">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm font-medium text-brand/70">
          Everything you need, right at your fingertips.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-card">
          <Search className="h-4 w-4 text-steel" />
          <input
            type="text"
            placeholder="Search for food, rides, services…"
            className="w-full bg-transparent text-sm text-brand outline-none placeholder:text-steel"
          />
        </div>
      </div>

      {/* Location selector — static for now, not wired to real geolocation/address picker yet */}
      <button type="button" className="flex items-center gap-1.5 text-sm font-semibold text-steel">
        <MapPin className="h-4 w-4 text-brand-accent" />
        Lagos, Nigeria
      </button>

      {/* Promo banner */}
      <div className="rounded-2xl bg-brand-accent px-5 py-4 text-white shadow-card-lg">
        <p className="text-sm font-bold">Safe. Fast. Reliable.</p>
        <p className="mt-1 text-xs text-white/80">Whatever you need, Crafteey delivers.</p>
      </div>

      {/* Service cards */}
      <div>
        <p className="mb-3 text-sm font-bold text-brand">Explore Crafteey</p>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                href={s.href}
                className="rounded-2xl bg-white p-4 shadow-card transition hover:shadow-card-lg"
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-bold text-brand">{s.label}</p>
                <p className="mt-0.5 text-xs text-steel">{s.sub}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent activity — placeholder until this pulls from real combined history */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-brand">Recent activity</p>
          <Link href="/dashboard/history" className="flex items-center gap-0.5 text-xs font-semibold text-brand-accent">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-steel">Your recent orders and bookings will show up here.</p>
        </div>
      </div>
    </div>
  );
}