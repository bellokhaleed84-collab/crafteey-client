import { FieldValue } from "firebase-admin/firestore";
import { connectToDatabase } from "@/lib/mongodb";
import { adminDb } from "@/lib/firebase/adminApp";
import Quote, { type IQuote } from "@/models/";
import { verifyTransaction } from "@/lib/paystack";
import { creditWallet } from "@/lib/wallet";

/** Chat notice after a quote is paid. A failure here never undoes the payment. */
export async function onQuotePaid(quote: IQuote) {
  try {
    const ref = adminDb.collection("conversations").doc(quote.conversationId);
    const text = `Payment received for "${quote.title}". The job is confirmed.`;
    const batch = adminDb.batch();
    batch.set(ref.collection("messages").doc(), {
      senderUid: "system",
      senderRole: "system",
      type: "system",
      quoteId: String(quote._id),
      text,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(ref, {
      lastMessage: text.slice(0, 120),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastSenderRole: "system",
      unreadCompany: FieldValue.increment(1),
    });
    await batch.commit();
  } catch (e) {
    console.error("[quote] paid notice failed", e);
  }
}

/** Money arrived but the quote can't take it (cancelled, declined, expired, or already paid). Goes to the wallet, once. */
async function refundLatePayment(quote: IQuote, reference: string, amountKobo: number) {
  await creditWallet({
    firebaseUid: quote.clientUid,
    amountKobo,
    reason: "refund",
    reference: `quote_refund_${reference}`,
    orderId: quote._id,
    note: "Refund: quotation could not be paid",
  });
  await Quote.updateOne(
    { _id: quote._id, "lateRefunds.reference": { $ne: reference } },
    { $push: { lateRefunds: { reference, amountKobo, at: new Date() } } }
  );
}

/**
 * Finish a quote payment after Paystack says it was paid. Safe to call many
 * times (verify button, webhook): the quote is flipped to paid exactly once.
 */
export async function settleQuoteFromPaystack(reference: string) {
  await connectToDatabase();

  const quote = await Quote.findOne({ "payment.references": reference });
  if (!quote) return { ok: false as const, reason: "quote_not_found" };
  if (quote.payment.status === "success" && quote.payment.reference === reference) {
    return { ok: true as const };
  }

  const tx = await verifyTransaction(reference);

  if (tx.status === "success") {
    if (tx.amount !== quote.totalKobo || tx.currency !== "NGN") {
      console.error("[quote] amount mismatch", { reference, paid: tx.amount, expected: quote.totalKobo });
      return { ok: false as const, reason: "amount_mismatch" };
    }
    const paidAt = tx.paid_at ? new Date(tx.paid_at) : new Date();

    // A payment started before the expiry time still counts.
    const updated = await Quote.findOneAndUpdate(
      {
        _id: quote._id,
        "payment.status": { $ne: "success" },
        $or: [
          { status: "sent" },
          { status: "expired", $expr: { $lte: ["$payment.initiatedAt", "$expiresAt"] } },
        ],
      },
      {
        $set: {
          status: "paid",
          statusAt: paidAt,
          jobStatus: "confirmed",
          "payment.status": "success",
          "payment.reference": reference,
          "payment.paidAt": paidAt,
          "payment.channel": tx.channel,
        },
      },
      { new: true }
    );

    if (updated) {
      await onQuotePaid(updated);
      return { ok: true as const };
    }
    await refundLatePayment(quote, reference, tx.amount);
    return { ok: true as const, refunded: true as const };
  }

  if (tx.status === "failed") {
    await Quote.updateOne({ _id: quote._id, "payment.status": "pending" }, { $set: { "payment.status": "failed" } });
  }
  return { ok: false as const, reason: tx.status };
}