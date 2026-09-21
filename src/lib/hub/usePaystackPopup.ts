"use client";

import { useCallback, useEffect } from "react";

interface PaystackTransaction {
  reference: string;
  status?: string;
  message?: string;
}

interface PaystackPopInstance {
  resumeTransaction: (
    accessCode: string,
    callbacks?: {
      onSuccess?: (tx: PaystackTransaction) => void;
      onCancel?: () => void;
      onError?: (err: { message?: string }) => void;
      onLoad?: (info: unknown) => void;
    }
  ) => void;
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance;
  }
}

const SRC = "https://js.paystack.co/v2/inline.js";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.PaystackPop) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Could not load Paystack. Check your internet connection and try again."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export interface PaystackHandlers {
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

/**
 * Opens Paystack's checkout on top of the current page (no redirect).
 * The customer picks card / bank / transfer / USSD inside it; bank transfer shows the account number to pay.
 */
export function usePaystackPopup() {
  useEffect(() => {
    loadScript().catch(() => undefined); // preload so it opens instantly
  }, []);

  return useCallback(async (accessCode: string, h: PaystackHandlers) => {
    try {
      await loadScript();
    } catch (e) {
      h.onError(e instanceof Error ? e.message : "Could not load Paystack");
      return;
    }
    const Pop = window.PaystackPop;
    if (!Pop) return h.onError("Paystack is not available right now");

    new Pop().resumeTransaction(accessCode, {
      onSuccess: (tx) => h.onSuccess(tx.reference),
      onCancel: () => h.onCancel(),
      onError: (err) => h.onError(err?.message || "Payment could not be started"),
    });
  }, []);
}
