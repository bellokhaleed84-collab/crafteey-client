import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import Review from "@/models/Review";
import { COURIER_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const LOOKBACK_DAYS = 14;

/** GET: the newest delivered request (last 14 days) that the customer has not rated yet, or null. */
export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const delivered = (await CourierRequest.find({
      clientUid: uid,
      status: COURIER_STATUS.DELIVERED,
      courierUid: { $ne: null },
      deliveredAt: { $gte: since },
    })
      .select("pickup dropoff courierName deliveredAt")
      .sort({ deliveredAt: -1 })
      .limit(5)
      .lean()) as any[];

    if (delivered.length === 0) return NextResponse.json({ request: null });

    const done = await Review.find({
      sourceType: "courier_request",
      targetType: "rider",
      sourceId: { $in: delivered.map((d) => String(d._id)) },
    })
      .select("sourceId")
      .lean();
    const doneIds = new Set(done.map((d) => String(d.sourceId)));

    const next = delivered.find((d) => !doneIds.has(String(d._id)));
    return NextResponse.json({
      request: next
        ? {
            _id: String(next._id),
            courierName: next.courierName ?? null,
            pickup: next.pickup,
            dropoff: next.dropoff,
            deliveredAt: next.deliveredAt,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/courier-requests/unrated failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}