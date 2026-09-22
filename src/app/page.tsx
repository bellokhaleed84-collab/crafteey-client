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
      // Signed in with Firebase but no Mongo profile yet — finish signup.
      router.replace("/register");
    } else {
      router.replace("/login");
    }
  }, [loading, user, client, router]);

  return <FullScreenSkeleton />;
}