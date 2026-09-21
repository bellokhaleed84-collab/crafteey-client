import { NextRequest, NextResponse } from "next/server";
import { isValidWebhookSignature } from "@/lib/paystack";
import { settleOrderFromPaystack } from "@/lib/hub/orders";

export const dynamic = "force-dynamic";

/**
 * Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/hub/paystack/webhook
 * It confirms payment even if the customer closes the browser before returning.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text(); // must be the raw body for the signature check
  if (!isValidWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let evt: { event?: string; data?: { reference?: string } };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  if (evt.event === "charge.success" && evt.data?.reference) {
    try {
      // Re-verifies with Paystack instead of trusting the webhook body
      await settleOrderFromPaystack(String(evt.data.reference));
    } catch (e) {
      console.error("[hub] webhook settle failed", e);
      return NextResponse.json({ error: "Retry" }, { status: 500 }); // Paystack will retry
    }
  }
  return NextResponse.json({ received: true });
}
