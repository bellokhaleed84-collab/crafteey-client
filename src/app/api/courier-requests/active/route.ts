import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import { COURIER_STATUS } from "@/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const request = await CourierRequest.findOne({
      clientUid: uid,
      status: { $nin: [COURIER_STATUS.DELIVERED, COURIER_STATUS.CANCELLED] },
    }).lean();

    return NextResponse.json({ request: request ?? null });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/courier-requests/active failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}