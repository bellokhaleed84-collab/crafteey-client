import { FieldValue } from "firebase-admin/firestore";
import { connectToDatabase } from "@/lib/mongodb";
import { adminDb } from "@/lib/firebase/adminApp";
import Quote, { type IQuote } from "@/models/Quote";
import CompanyJob from "@/models/CompanyJob";
import CompanyRequest from "@/models/CompanyRequest";
import { verifyTransaction } from "@/lib/paystack";
import { creditWallet } from "@/lib/wallet";
import { creditCompanyWallet } from "@/lib/companyWallet";

function isDuplicateKey(e: unknown): boolean {
  return (e as { code?: number } | null)?.code === 11000;
}

/** Chat notice after a quote is paid. A failure here never undoes the payment. */
async function postPaidNotice(quote: IQuote) {
  try {
    const ref = adminDb.collection("conversations").doc(quote.conversationId);
    const text =
      quote.kind === "additional"
        ? `Payment received for additional work: "${quote.title}".`
        : `Payment received for "${quote.title}". The job is confirmed.`;
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

/** The job for a paid quote. A main quote makes a new job; an additional quote joins the chat's latest job. */
async function ensureJob(quote: IQuote) {
  const already = await CompanyJob.findOne({ quoteIds: quote._id });
  if (already) return already;

  if (quote.kind === "additional") {
    const joined = await CompanyJob.findOneAndUpdate(
      { conversationId: quote.conversationId, status: { $ne: "cancelled" } },
      { $addToSet: { quoteIds: quote._id } },
      { new: true, sort: { createdAt: -1 } }
    );
    if (joined) return joined;
  }

  const conv = await adminDb.collection("conversations").doc(quote.conversationId).get();
  const clientName = String(conv.data()?.clientName || "Customer");
  const request = await CompanyRequest.findOne({ conversationId: quote.conversationId }).select("area").lean();

  try {
    return await CompanyJob.create({
      companyId: quote.companyId,
      conversationId: quote.conversationId,
      clientUid: quote.clientUid,
      clientName,
      mainQuoteId: quote._id,
      quoteIds: [quote._id],
      title: quote.title,
      description: quote.description,
      area: request?.area ?? "",
      status: "confirmed",
      workerUid: null,
      workerName: null,
    });
  } catch (e) {
    if (isDuplicateKey(e)) return CompanyJob.findOne({ mainQuoteId: quote._id });
    throw e;
  }
}

/**
 * Everything that follows a successful quote payment: pay the company's wallet,
 * make sure the job exists, tell the chat. Every step is safe to repeat, so any
 * caller (webhook, verify, wallet payment, chat reload) can run it again.
 */
export async function finalizePaidQuote(quoteId: string): Promise<void> {
  await connectToDatabase();
  const quote = await Quote.findById(quoteId);
  if (!quote || quote.status !== "paid") return;

  await creditCompanyWallet({
    companyId: quote.companyId,
    amountKobo: quote.companyEarningKobo,
    reference: `quote_earning_${quote._id}`,
    quoteId: quote._id,
    note: `Earnings: ${quote.title}`.slice(0, 200),
  });

  const job = await ensureJob(quote);
  if (job && !quote.jobId) {
    await Quote.updateOne({ _id: quote._id, jobId: { $exists: false } }, { $set: { jobId: job._id } });
  }

  // Only the first run posts the chat notice.
  const first = await Quote.findOneAndUpdate(
    { _id: quote._id, companyCreditedAt: null },
    { $set: { companyCreditedAt: new Date() } }
  );
  if (first) await postPaidNotice(quote);
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
    if (!quote.companyCreditedAt) {
      await finalizePaidQuote(String(quote._id)).catch((e) => console.error("[quote] finalize failed", e));
    }
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
      // The customer has paid for certain. If a follow-up step fails it is retried
      // the next time the chat loads, so we don't turn this into an error.
      await finalizePaidQuote(String(updated._id)).catch((e) => console.error("[quote] finalize failed", e));
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