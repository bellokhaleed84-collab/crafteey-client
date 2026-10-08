import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";

export const dynamic = "force-dynamic";

/** GET /api/courier-requests/[id] -> one delivery that belongs to the signed-in client. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const { id } = params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    // Rider payout, decline list, rider id, pickup code and live position
    // are not sent to the customer.
    const request = await CourierRequest.findOne({ _id: id, clientUid: uid })
      .select("-riderEarningKobo -declinedBy -courierUid -pickupCode -courierLocation")
      .lean();

    if (!request) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/courier-requests/[id] failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}