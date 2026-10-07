"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import DashboardNav from "@/components/DashboardNav";
import { FullScreenSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, client, loading, profileError, refetchClient } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileError) return;
    if (!user) {
      router.replace("/login");
    } else if (!client) {
      router.replace("/register");
    }
  }, [loading, profileError, user, client, router]);

  if (!loading && user && profileError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center dark:bg-slate-950">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          We couldn&apos;t load your account. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void refetchClient()}
          className="min-h-12 rounded-xl bg-brand-accent px-6 font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading || !user || !client) {
    return <FullScreenSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/dashboard" className="font-bold text-brand dark:text-white">
          Crafteey
        </Link>
        <span className="text-sm text-slate-500 dark:text-slate-400">{client.name}</span>
      </header>
      <main className="mx-auto max-w-2xl p-6 pb-24">{children}</main>
      <DashboardNav />
    </div>
  );
}