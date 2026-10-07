import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidWebhookSignature } from "@/lib/paystack";
import { settleOrderFromPaystack } from "@/lib/hub/orders";
import { settleQuoteFromPaystack } from "@/lib/quotePayments";
import { settleWalletTopup } from "@/lib/wallet";
import { settleCompanyPayout } from "@/lib/companyPayouts";

export const dynamic = "force-dynamic";

/**
 * The ONE Paystack webhook for the whole platform. URL stays the same:
 *   https://YOUR-DOMAIN/api/hub/paystack/webhook
 * Payments are sent to the right handler by their reference prefix:
 *   hub-    Hub orders
 *   quote-  company quotations
 *   wtop-   wallet top-ups
 *   cpay-   company withdrawals (transfer.* events)
 * Every handler re-verifies with Paystack and is safe to run more than once.
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

  const reference = evt.data?.reference ? String(evt.data.reference) : "";
  if (reference) {
    try {
      await connectToDatabase();
      if (evt.event === "charge.success") {
        if (reference.startsWith("hub-")) await settleOrderFromPaystack(reference);
        else if (reference.startsWith("quote-")) await settleQuoteFromPaystack(reference);
        else if (reference.startsWith("wtop-")) await settleWalletTopup(reference);
      } else if (evt.event?.startsWith("transfer.") && reference.startsWith("cpay-")) {
        await settleCompanyPayout(reference);
      }
    } catch (e) {
      console.error("[paystack] webhook settle failed", reference, e);
      return NextResponse.json({ error: "Retry" }, { status: 500 }); // Paystack will retry
    }
  }
  return NextResponse.json({ received: true });
}