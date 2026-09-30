import mongoose, { type ClientSession, type Types, type UpdateQuery } from "mongoose";
import Wallet, { type IWallet } from "@/models/Wallet";
import WalletTransaction, { type WalletReason } from "@/models/WalletTransaction";
import WalletTopup from "@/models/WalletTopup";
import { verifyTransaction } from "@/lib/paystack";

export interface MoveInput {
  firebaseUid: string;
  clientId?: Types.ObjectId;
  amountKobo: number;
  reason: WalletReason;
  // Must be unique per money move, e.g. `refund_<orderId>`. The ledger rejects
  // a repeat, so retries and double taps can never move money twice.
  reference: string;
  orderId?: Types.ObjectId | string;
  note?: string;
}

export type CreditResult = { applied: boolean; balanceKobo: number };
export type DebitResult =
  | { ok: true; balanceKobo: number }
  | { ok: false; reason: "insufficient" | "duplicate" };

function assertAmount(amountKobo: number) {
  if (!Number.isInteger(amountKobo) || amountKobo <= 0) {
    throw new Error("Wallet amount must be a positive whole number of kobo");
  }
}

function isDuplicateKey(e: unknown): boolean {
  return (e as { code?: number } | null)?.code === 11000;
}

/** Credit inside a transaction the caller controls (used for order + refund together). */
export async function creditInSession(session: ClientSession, input: MoveInput): Promise<CreditResult> {
  assertAmount(input.amountKobo);

  const existing = await WalletTransaction.findOne({ reference: input.reference })
    .session(session)
    .select("balanceAfterKobo")
    .lean();
  if (existing) return { applied: false, balanceKobo: existing.balanceAfterKobo };

  const update: UpdateQuery<IWallet> = { $inc: { balanceKobo: input.amountKobo } };
  if (input.clientId) update.$setOnInsert = { clientId: input.clientId };

  const wallet = await Wallet.findOneAndUpdate({ firebaseUid: input.firebaseUid }, update, {
    new: true,
    upsert: true,
    session,
  });
  if (!wallet) throw new Error("Wallet update failed");

  await WalletTransaction.create(
    [
      {
        firebaseUid: input.firebaseUid,
        type: "credit",
        reason: input.reason,
        amountKobo: input.amountKobo,
        balanceAfterKobo: wallet.balanceKobo,
        reference: input.reference,
        orderId: input.orderId,
        note: input.note,
      },
    ],
    { session }
  );

  return { applied: true, balanceKobo: wallet.balanceKobo };
}

/** Debit inside a transaction the caller controls. The balance can never go below zero. */
export async function debitInSession(session: ClientSession, input: MoveInput): Promise<DebitResult> {
  assertAmount(input.amountKobo);

  const existing = await WalletTransaction.findOne({ reference: input.reference })
    .session(session)
    .select("_id")
    .lean();
  if (existing) return { ok: false, reason: "duplicate" };

  // The balance check is part of the update itself, so two payments at the same
  // moment can't both spend the same money.
  const wallet = await Wallet.findOneAndUpdate(
    { firebaseUid: input.firebaseUid, balanceKobo: { $gte: input.amountKobo } },
    { $inc: { balanceKobo: -input.amountKobo } },
    { new: true, session }
  );
  if (!wallet) return { ok: false, reason: "insufficient" };

  await WalletTransaction.create(
    [
      {
        firebaseUid: input.firebaseUid,
        type: "debit",
        reason: input.reason,
        amountKobo: input.amountKobo,
        balanceAfterKobo: wallet.balanceKobo,
        reference: input.reference,
        orderId: input.orderId,
        note: input.note,
      },
    ],
    { session }
  );

  return { ok: true, balanceKobo: wallet.balanceKobo };
}

/** Stand-alone credit (top-ups). Safe to call again with the same reference. */
export async function creditWallet(input: MoveInput): Promise<CreditResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const session = await mongoose.startSession();
    const out: { value?: CreditResult } = {};
    try {
      await session.withTransaction(async () => {
        out.value = await creditInSession(session, input);
      });
      if (out.value) return out.value;
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      // Either this reference was just applied by another request, or two first
      // credits created the wallet at the same moment. Check, then retry.
      const existing = await WalletTransaction.findOne({ reference: input.reference })
        .select("balanceAfterKobo")
        .lean();
      if (existing) return { applied: false, balanceKobo: existing.balanceAfterKobo };
    } finally {
      await session.endSession();
    }
  }
  throw new Error("Could not update the wallet. Please try again.");
}

/**
 * Finish a wallet top-up after Paystack says it was paid. Safe to call many
 * times (verify button, webhook): the ledger reference makes the credit apply once.
 */
export async function settleWalletTopup(reference: string): Promise<{ ok: boolean; reason?: string }> {
  const topup = await WalletTopup.findOne({ reference });
  if (!topup) return { ok: false, reason: "not_found" };
  if (topup.status === "success") return { ok: true };

  const tx = await verifyTransaction(reference);

  if (tx.status === "success") {
    if (tx.amount !== topup.amountKobo || tx.currency !== "NGN") {
      console.error("[wallet] top-up amount mismatch", { reference, paid: tx.amount, expected: topup.amountKobo });
      return { ok: false, reason: "amount_mismatch" };
    }

    await creditWallet({
      firebaseUid: topup.firebaseUid,
      clientId: topup.clientId,
      amountKobo: topup.amountKobo,
      reason: "topup",
      reference: `topup_${reference}`,
      note: "Wallet top-up",
    });
    await WalletTopup.updateOne(
      { _id: topup._id, status: { $ne: "success" } },
      { $set: { status: "success", paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date() } }
    );
    return { ok: true };
  }

  if (tx.status === "failed") {
    await WalletTopup.updateOne({ _id: topup._id, status: "pending" }, { $set: { status: "failed" } });
  }
  return { ok: false, reason: tx.status };
}