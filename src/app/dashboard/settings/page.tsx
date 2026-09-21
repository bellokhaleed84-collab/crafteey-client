"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  CreditCard,
  MapPin,
  Bell,
  Headphones,
  ShieldCheck,
  FileText,
  Globe,
  Info,
  LogOut,
  Trash2,
  ChevronRight,
  Pencil,
  BadgeCheck,
  Phone,
  Mail,
} from "lucide-react";

type Row = {
  href?: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
};

const ACCOUNT_ROWS: Row[] = [
  {
    href: "/dashboard/settings/profile",
    icon: User,
    title: "My Profile",
    subtitle: "View and edit your personal information.",
  },
  {
    href: "/dashboard/settings/payments",
    icon: CreditCard,
    title: "Payments & Bookings",
    subtitle: "Payment methods and your past bookings.",
  },
  {
    // Requires the saved-addresses page from the earlier settings batch.
    href: "/dashboard/settings/addresses",
    icon: MapPin,
    title: "Saved Addresses",
    subtitle: "Manage your pickup and delivery locations.",
  },
  {
    href: "/dashboard/settings/preferences",
    icon: Bell,
    title: "Notifications",
    subtitle: "Control what you get notified about.",
  },
];

const SUPPORT_ROWS: Row[] = [
  {
    href: "/dashboard/settings/support",
    icon: Headphones,
    title: "Help & Support",
    subtitle: "FAQs, contact support and report a problem.",
  },
  {
    href: "/dashboard/settings/profile",
    icon: ShieldCheck,
    title: "Security & Privacy",
    subtitle: "Manage your password and email.",
  },
  {
    href: "/dashboard/settings/support",
    icon: FileText,
    title: "Terms & Conditions",
    subtitle: "Read our terms of service and privacy policy.",
  },
];

const PREF_ROWS: Row[] = [
  {
    href: "/dashboard/settings/preferences",
    icon: Globe,
    title: "Language & Appearance",
    subtitle: "Choose your language and dark mode.",
  },
  {
    icon: Info,
    title: "About Crafteey",
    subtitle: "Version 1.0.0",
  },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="px-1 text-base font-bold text-slate-900 dark:text-slate-100">{children}</h2>
  );
}

function IconBubble({ icon: Icon }: { icon: Row["icon"] }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-accent dark:bg-slate-800">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function RowGroup({ rows }: { rows: Row[] }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {rows.map((row) => {
        const content = (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <IconBubble icon={row.icon} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{row.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.subtitle}</p>
              </div>
            </div>
            {row.href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />}
          </>
        );

        return row.href ? (
          <Link
            key={row.title}
            href={row.href}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            {content}
          </Link>
        ) : (
          <div key={row.title} className="flex items-center justify-between gap-3 px-4 py-3.5">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const { client, user, signOut, getIdToken } = useAuth();
  const router = useRouter();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const initials =
    (client?.name ?? "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C";

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      router.replace("/login");
    } catch {
      setDeleteError("Couldn't delete your account. Try again or contact support.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-brand dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your account, preferences and get the help you need.
        </p>
      </div>

      {/* Profile card */}
      <Link
        href="/dashboard/settings/profile"
        className="relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-100 via-yellow-50 to-amber-50 p-4 shadow-sm ring-1 ring-yellow-200/60 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 dark:ring-slate-700"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-xl font-extrabold text-slate-900 ring-4 ring-white/80 dark:ring-slate-700">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
            {client?.name ?? "Your account"}
          </p>
          {client?.phone && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{client.phone}</span>
            </p>
          )}
          {(user?.email || client?.email) && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{user?.email ?? client?.email}</span>
            </p>
          )}
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-brand-accent dark:bg-slate-700">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified User
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300/70 text-brand-accent dark:bg-slate-700">
            <Pencil className="h-4 w-4" />
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </div>
      </Link>

      <section className="space-y-3">
        <SectionTitle>Account & Services</SectionTitle>
        <RowGroup rows={ACCOUNT_ROWS} />
      </section>

      <section className="space-y-3">
        <SectionTitle>Support & Security</SectionTitle>
        <RowGroup rows={SUPPORT_ROWS} />
      </section>

      <section className="space-y-3">
        <SectionTitle>App Preferences</SectionTitle>
        <RowGroup rows={PREF_ROWS} />
      </section>

      <section className="space-y-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-left transition hover:bg-red-100/70 dark:border-red-900/40 dark:bg-red-950/20 dark:hover:bg-red-950/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-red-600 dark:bg-slate-900">
              <LogOut className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Log out</span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="mx-auto flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-400 transition hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete account
        </button>
      </section>

      {deleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-900">
            <h2 className="mb-2 text-base font-bold text-slate-900 dark:text-slate-100">
              Delete your account?
            </h2>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              This can't be undone. All your jobs, deliveries, and account data will be permanently removed.
            </p>
            {deleteError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}