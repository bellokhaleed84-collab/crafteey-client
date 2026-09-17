"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, Briefcase, ChevronRight } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>
      <h1 className="text-lg font-bold text-brand dark:text-white">Payments & bookings</h1>

      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Payments
        </p>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <CreditCard className="mx-auto mb-2 h-6 w-6 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Coming soon</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Saved payment methods will show up here once payments launch.
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Bookings
        </p>
        <Link
          href="/dashboard"
          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your jobs</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">View past and current bookings</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        </Link>
      </section>
    </div>
  );
}