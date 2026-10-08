"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenSkeleton } from "@/components/ui/Skeleton";

export default function HomePage() {
  const { user, client, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && client) {
      router.replace("/dashboard");
    } else if (user && !client) {
      // Signed in with Firebase but no Mongo profile yet: finish signup.
      router.replace("/register");
    } else {
      // Not signed in: first-time visitors see the intro slides once.
      let seen = false;
      try {
        seen = localStorage.getItem("crafteey_onboarded") === "1";
      } catch {}
      router.replace(seen ? "/login" : "/welcome");
    }
  }, [loading, user, client, router]);

  return <FullScreenSkeleton />;
}