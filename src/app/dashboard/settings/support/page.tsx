"use client";

import Link from "next/link";
import { useState } from "react";
import { Flag, Inbox, Phone, ChevronRight, ChevronDown } from "lucide-react";
import SettingsHeader from "@/components/SettingsHeader";

const HOTLINE = process.env.NEXT_PUBLIC_SUPPORT_HOTLINE || "";

const CARD =
  "overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
const ROW =
  "flex min-h-16 items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60";

const FAQ = [
  {
    q: "Where do I find my food and grocery orders?",
    a: "Open the Hub tab, then tap Orders. You can follow each order there.",
  },
  {
    q: "How do I add money to my wallet?",
    a: "Open the Hub tab and go to Wallet. Choose Top up and pay with your card.",
  },
  {
    q: "Can I chat or pay a technician company outside Crafteey?",
    a: "No. Phone numbers, emails, links and payment details are blocked in chats. Keep everything inside Crafteey so you stay protected.",
  },
  {
    q: "I paid but my order or job did not update.",
    a: "Wait a minute and open the page again. If nothing changes, tap Report a problem below and choose Payment or wallet.",
  },
];

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

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <SettingsHeader title="Help & Support" subtitle="Quick answers, or tell us what went wrong." />

      <section className="space-y-3">
        <SectionTitle>Get help</SectionTitle>
        <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-800`}>
          <Link href="/dashboard/settings/support/report" className={ROW}>
            <div className="flex items-center gap-3">
              <Bubble>
                <Flag className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Report a problem</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Tell us what went wrong. We will chat with you.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </Link>
          <Link href="/dashboard/settings/support/tickets" className={ROW}>
            <div className="flex items-center gap-3">
              <Bubble>
                <Inbox className="h-5 w-5" />
              </Bubble>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">My reports</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">See replies and the status of your reports.</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </Link>
          {HOTLINE && (
            <a href={`tel:${HOTLINE.replace(/\s+/g, "")}`} className={ROW}>
              <div className="flex items-center gap-3">
                <Bubble>
                  <Phone className="h-5 w-5" />
                </Bubble>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Call support</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{HOTLINE}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            </a>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Quick answers</SectionTitle>
        <div className={`${CARD} divide-y divide-slate-100 dark:divide-slate-800`}>
          {FAQ.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && <p className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-300">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}