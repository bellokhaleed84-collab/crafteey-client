"use client";

import Link from "next/link";
import { CreditCard, Briefcase, Truck, ChevronRight } from "lucide-react";
import SettingsHeader from "@/components/SettingsHeader";

const CARD =
  "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">{children}</h2>;
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-accent dark:bg-slate-800">
      {children}
    </span>
  );
}

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader title="Payments & Bookings" subtitle="Payment methods and your past bookings." />

      <section className="space-y-3">
        <SectionTitle>Payment methods</SectionTitle>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 dark:bg-slate-800">
            <CreditCard className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Payments are coming soon</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            You'll be able to save cards and pay in the app once payments launch.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Bookings</SectionTitle>
        <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-800`}>
          <Link
            href="/dashboard/history"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-3">
              <Bubble>
                <Briefcase className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Booking history</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Technician jobs and deliveries.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </Link>
          <Link
            href="/dashboard/rider"
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-3">
              <Bubble>
                <Truck className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Current delivery</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track or book a delivery.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </Link>
        </div>
      </section>
    </div>
  );
}