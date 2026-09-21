import crypto from "crypto";

const BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("Missing PAYSTACK_SECRET_KEY environment variable");
  return key;
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) {
    throw new Error(json?.message || `Paystack request failed (${res.status})`);
  }
  return json.data as T;
}

export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitData> {
  return paystack<PaystackInitData>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo, // kobo
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export interface PaystackVerifyData {
  status: string; // "success" | "failed" | "abandoned" | ...
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string;
}

export function verifyTransaction(reference: string): Promise<PaystackVerifyData> {
  return paystack<PaystackVerifyData>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs the raw webhook body with HMAC-SHA512 using your secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
