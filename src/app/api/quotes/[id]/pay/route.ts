import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Quote from "@/models/Quote";
import Company from "@/models/Company";
import { getClientByUid } from "@/lib/hub/getClient";
import { initializeTransaction } from "@/lib/paystack";
import { effectiveStatus, quoteBlockMessage } from "@/lib/quoteShared";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/** POST /api/quotes/[id]/pay : starts a Paystack payment. The amount comes from the database, never from the app. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid quotation id");
    await connectToDatabase();

    const quote = await Quote.findOne({ _id: params.id, clientUid: user.uid });
    if (!quote) return fail("Quotation not found", 404);

    const status = effectiveStatus(quote);
    if (status !== "sent") return fail(quoteBlockMessage(status), 409);

    const companyOk = await Company.exists({ _id: quote.companyId, status: "approved" });
    if (!companyOk) return fail("This company isn't available right now.", 409);

    const client = await getClientByUid(user.uid);
    const reference = `quote-${quote._id}-${crypto.randomBytes(4).toString("hex")}`;

    const marked = await Quote.updateOne(
      { _id: quote._id, status: "sent", expiresAt: { $gt: new Date() }, "payment.status": { $ne: "success" } },
      {
        $push: { "payment.references": reference },
        $set: { "payment.status": "pending", "payment.initiatedAt": new Date() },
      }
    );
    if (marked.modifiedCount !== 1) return fail("This quotation can't be paid right now.", 409);

    const init = await initializeTransaction({
      email: client?.email || user.email || "",
      amountKobo: quote.totalKobo,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/chats/${quote.conversationId}?quote=${quote._id}`,
      metadata: { quoteId: String(quote._id), source: "crafteey-quote" },
    });
    return NextResponse.json({ accessCode: init.access_code, authorizationUrl: init.authorization_url, reference });
  } catch (e) {
    return handleError(e);
  }
}