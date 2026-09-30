import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder, { type IHubOrder } from "@/models/HubOrder";
import { debitInSession } from "@/lib/wallet";
import { onOrderPaid, orderBlocker } from "@/lib/hub/orders";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

type WalletCode = "insufficient" | "not_payable";

// A plain error with a code, so the catch below can tell expected stops
// (aborting the transaction) from real failures.
function stop(code: WalletCode) {
  return Object.assign(new Error(code), { walletCode: code });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid order id");
    await connectToDatabase();

    const order = await HubOrder.findOne({ _id: params.id, firebaseUid: user.uid });
    if (!order) return fail("Order not found", 404);
    if (order.status !== "pending_payment" || order.payment.status === "success") {
      return fail("This order doesn't need payment", 409);
    }

    const blocker = await orderBlocker(order);
    if (blocker) return fail(blocker, 409);

    const session = await mongoose.startSession();
    const out: { order?: IHubOrder } = {};
    try {
      await session.withTransaction(async () => {
        const debit = await debitInSession(session, {
          firebaseUid: user.uid,
          amountKobo: order.totalKobo,
          reason: "order_payment",
          // One wallet payment per order: a repeat can't be applied twice.
          reference: `order_${order._id}`,
          orderId: order._id,
          note: `Payment for order ${order.orderNumber}`,
        });
        if (!debit.ok) throw stop(debit.reason === "insufficient" ? "insufficient" : "not_payable");

        const updated = await HubOrder.findOneAndUpdate(
          {
            _id: order._id,
            firebaseUid: user.uid,
            status: "pending_payment",
            "payment.status": { $ne: "success" },
          },
          {
            $set: {
              "payment.status": "success",
              "payment.paidAt": new Date(),
              "payment.channel": "wallet",
              status: "paid",
            },
          },
          { new: true, session }
        );
        // The order was paid some other way a moment ago: abort, which also
        // undoes the wallet debit above.
        if (!updated) throw stop("not_payable");
        out.order = updated;
      });
    } catch (e) {
      const code = (e as { walletCode?: WalletCode } | null)?.walletCode;
      if (code === "insufficient") return fail("Your wallet balance is too low for this order", 402);
      if (code === "not_payable") return fail("This order doesn't need payment", 409);
      throw e;
    } finally {
      await session.endSession();
    }

    // Same follow-up as a Paystack payment: stock and rider dispatch.
    if (out.order) await onOrderPaid(out.order);

    return NextResponse.json({ orderId: String(order._id), status: "paid" });
  } catch (e) {
    return handleError(e);
  }
}