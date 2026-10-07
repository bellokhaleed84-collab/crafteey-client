import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Quote from "@/models/Quote";
import Company from "@/models/Company";
import { debitInSession } from "@/lib/wallet";
import { finalizePaidQuote } from "@/lib/quotePayments";
import { effectiveStatus, quoteBlockMessage } from "@/lib/quoteShared";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

type WalletCode = "insufficient" | "not_payable";
function stop(code: WalletCode) {
  return Object.assign(new Error(code), { walletCode: code });
}

/** POST /api/quotes/[id]/pay-wallet : pay a quotation from the customer's Crafteey wallet. */
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

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const debit = await debitInSession(session, {
          firebaseUid: user.uid,
          amountKobo: quote.totalKobo,
          reason: "order_payment",
          reference: `quote_${quote._id}`, // one wallet payment per quote
          orderId: quote._id,
          note: `Payment for quotation: ${quote.title}`.slice(0, 200),
        });
        if (!debit.ok) throw stop(debit.reason === "insufficient" ? "insufficient" : "not_payable");

        const now = new Date();
        const updated = await Quote.findOneAndUpdate(
          {
            _id: quote._id,
            clientUid: user.uid,
            status: "sent",
            expiresAt: { $gt: now },
            "payment.status": { $ne: "success" },
          },
          {
            $set: {
              status: "paid",
              statusAt: now,
              jobStatus: "confirmed",
              "payment.status": "success",
              "payment.paidAt": now,
              "payment.channel": "wallet",
            },
          },
          { new: true, session }
        );
        if (!updated) throw stop("not_payable"); // aborts, which also undoes the debit
      });
    } catch (e) {
      const code = (e as { walletCode?: WalletCode } | null)?.walletCode;
      if (code === "insufficient") return fail("Your wallet balance is too low for this quotation", 402);
      if (code === "not_payable") return fail("This quotation can't be paid right now.", 409);
      throw e;
    } finally {
      await session.endSession();
    }

    // Paid for certain. If a follow-up step fails it is retried when the chat loads.
    await finalizePaidQuote(String(quote._id)).catch((e) => console.error("[quote] finalize failed", e));
    const fresh = await Quote.findById(quote._id).select("jobId").lean();
    return NextResponse.json({ ok: true, status: "paid", jobId: fresh?.jobId ? String(fresh.jobId) : null });
  } catch (e) {
    return handleError(e);
  }
}