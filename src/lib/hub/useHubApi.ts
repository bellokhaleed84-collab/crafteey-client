"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

/** Authenticated fetch for the hub API. The returned function is stable between renders. */
export function useHubApi() {
  const { getIdToken } = useAuth();
  const tokenRef = useRef(getIdToken);
  tokenRef.current = getIdToken;

  return useCallback(async function call<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await tokenRef.current();
    const res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`);
    return data as T;
  }, []);
}
