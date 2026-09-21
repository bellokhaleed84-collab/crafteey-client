import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import { settleOrderFromPaystack } from "@/lib/hub/orders";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/** Called by the order page after Paystack redirects back. Confirms payment server-side. */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) return fail("Missing reference");

    await connectToDatabase();
    const mine = await HubOrder.findOne({ "payment.reference": reference, firebaseUid: user.uid }).select("_id");
    if (!mine) return fail("Order not found", 404);

    await settleOrderFromPaystack(reference);
    const order = await HubOrder.findById(mine._id).lean();
    return NextResponse.json({ paid: order?.payment.status === "success", order });
  } catch (e) {
    return handleError(e);
  }
}
