import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Quote from "@/models/Quote";
import { settleQuoteFromPaystack } from "@/lib/quotePayments";
import { quoteView } from "@/lib/quoteShared";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/** GET /api/quotes/verify?reference=... : called after Paystack returns. Confirms payment server-side. */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference || !reference.startsWith("quote-")) return fail("Missing reference");

    await connectToDatabase();
    const mine = await Quote.findOne({ "payment.references": reference, clientUid: user.uid }).select("_id");
    if (!mine) return fail("Quotation not found", 404);

    const result = await settleQuoteFromPaystack(reference);
    const quote = await Quote.findById(mine._id);
    return NextResponse.json({
      paid: quote?.payment.status === "success" && quote.payment.reference === reference,
      refundedToWallet: "refunded" in result && result.refunded === true,
      quote: quote ? quoteView(quote, "client") : null,
    });
  } catch (e) {
    return handleError(e);
  }
}