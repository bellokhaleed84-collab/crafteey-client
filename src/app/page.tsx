"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function HomePage() {
  const { user, client, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && client) {
      router.replace("/dashboard");
    } else if (user && !client) {
      // Signed in with Firebase but no Mongo profile yet — finish signup.
      router.replace("/register");
    } else {
      router.replace("/login");
    }
  }, [loading, user, client, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}
