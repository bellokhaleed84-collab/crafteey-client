import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import { getClientByUid } from "@/lib/hub/getClient";
import { newReference } from "@/lib/hub/orders";
import { initializeTransaction } from "@/lib/paystack";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

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

    const client = await getClientByUid(user.uid);
    const reference = newReference(String(order._id));
    order.payment.reference = reference;
    order.payment.status = "pending";
    await order.save();

    const init = await initializeTransaction({
      email: client?.email || user.email || "",
      amountKobo: order.totalKobo,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/hub/orders/${order._id}`,
      metadata: { orderId: String(order._id), source: "crafteey-hub" },
    });
    return NextResponse.json({ authorizationUrl: init.authorization_url, reference });
  } catch (e) {
    return handleError(e);
  }
}
