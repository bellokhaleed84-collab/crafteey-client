import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import HubOrder, { type IHubOrder } from "@/models/HubOrder";
import HubProduct from "@/models/HubProduct";
import { verifyTransaction } from "@/lib/paystack";

export function newReference(orderId: string): string {
  return `hub-${orderId}-${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Runs exactly once per order, right after payment is confirmed.
 * This is where the courier request will be created (next step).
 */
async function onOrderPaid(order: IHubOrder) {
  try {
    // Reduce stock for items that track it (null/undefined stock = unlimited)
    // (only products that track stock have a numeric stock; the $gte also stops it going below zero)
    await Promise.all(
      order.items.map((it) =>
        HubProduct.updateOne({ _id: it.productId, stock: { $gte: it.quantity } }, { $inc: { stock: -it.quantity } })
      )
    );
    // TODO (step 2): create the courier request for the riders here,
    // using your existing first-come-first-served flow.
  } catch (e) {
    console.error("[hub] onOrderPaid failed", e);
  }
}

/**
 * Verifies a reference with Paystack and settles the order.
 * Safe to call from both the verify route and the webhook (idempotent).
 */
export async function settleOrderFromPaystack(reference: string) {
  await connectToDatabase();

  const order = await HubOrder.findOne({ "payment.reference": reference });
  if (!order) return { ok: false as const, reason: "order_not_found" };
  if (order.payment.status === "success") return { ok: true as const };

  const tx = await verifyTransaction(reference);

  if (tx.status === "success") {
    // Never trust the client: amount and currency must match what we charged.
    if (tx.amount !== order.totalKobo || tx.currency !== "NGN") {
      console.error("[hub] amount mismatch", { reference, paid: tx.amount, expected: order.totalKobo });
      return { ok: false as const, reason: "amount_mismatch" };
    }

    const updated = await HubOrder.findOneAndUpdate(
      { _id: order._id, "payment.status": { $ne: "success" } },
      {
        $set: {
          "payment.status": "success",
          "payment.paidAt": tx.paid_at ? new Date(tx.paid_at) : new Date(),
          "payment.channel": tx.channel,
          status: "paid",
        },
      },
      { new: true }
    );
    if (updated) await onOrderPaid(updated); // only the caller that flips the status runs this
    return { ok: true as const };
  }

  if (tx.status === "failed") {
    await HubOrder.updateOne({ _id: order._id, "payment.status": "pending" }, { $set: { "payment.status": "failed" } });
  }
  return { ok: false as const, reason: tx.status };
}