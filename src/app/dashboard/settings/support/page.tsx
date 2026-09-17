"use client";

import Link from "next/link";
import { ArrowLeft, LifeBuoy, Mail, FileText, Shield, ChevronRight } from "lucide-react";

// Update these hrefs once the actual pages/addresses exist — /support,
// /terms, and /privacy aren't confirmed to exist yet in this app, and
// support@crafteey.com is a placeholder address.
const SUPPORT_LINKS = [
  {
    href: "/support",
    icon: LifeBuoy,
    title: "Help Center",
    subtitle: "Guides and frequently asked questions",
  },
  {
    href: "mailto:support@crafteey.com",
    icon: Mail,
    title: "Contact Support",
    subtitle: "Email our support team directly",
  },
  {
    href: "/terms",
    icon: FileText,
    title: "Terms of Service",
    subtitle: "",
  },
  {
    href: "/privacy",
    icon: Shield,
    title: "Privacy Policy",
    subtitle: "",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Settings
      </Link>
      <h1 className="text-lg font-bold text-brand dark:text-white">Support</h1>

      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {SUPPORT_LINKS.map(({ href, icon: Icon, title, subtitle }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}