"use client";

import Link from "next/link";
import { Headphones, Mail, FileText, ShieldCheck, ChevronRight } from "lucide-react";
import SettingsHeader from "@/components/SettingsHeader";

// Update these once the real pages/addresses exist. /support, /terms and
// /privacy aren't confirmed to exist yet, and the email is a placeholder.
const HELP_ROWS = [
  {
    href: "/support",
    icon: Headphones,
    title: "Help Center",
    subtitle: "Guides and frequently asked questions.",
  },
  {
    href: "mailto:support@crafteey.com",
    icon: Mail,
    title: "Contact Support",
    subtitle: "Email our support team directly.",
  },
];

const LEGAL_ROWS = [
  {
    href: "/terms",
    icon: FileText,
    title: "Terms of Service",
    subtitle: "The rules for using Crafteey.",
  },
  {
    href: "/privacy",
    icon: ShieldCheck,
    title: "Privacy Policy",
    subtitle: "How we collect and use your data.",
  },
];

const CARD =
  "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const ROW =
  "flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">{children}</h2>;
}

function RowGroup({ rows }: { rows: typeof HELP_ROWS }) {
  return (
    <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-800`}>
      {rows.map(({ href, icon: Icon, title, subtitle }) => {
        const inner = (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-accent dark:bg-slate-800">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </>
        );
        // mailto links should be plain anchors, not client-side routes.
        return href.startsWith("mailto:") ? (
          <a key={href} href={href} className={ROW}>
            {inner}
          </a>
        ) : (
          <Link key={href} href={href} className={ROW}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader title="Help & Support" subtitle="FAQs, contact support and legal information." />

      <section className="space-y-3">
        <SectionTitle>Get help</SectionTitle>
        <RowGroup rows={HELP_ROWS} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Legal</SectionTitle>
        <RowGroup rows={LEGAL_ROWS} />
      </section>
    </div>
  );
}