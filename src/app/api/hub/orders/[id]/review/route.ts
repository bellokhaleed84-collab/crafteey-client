import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import HubVendor from "@/models/HubVendor";
import HubReview from "@/models/HubReview";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid order id");
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const rating = Number(body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Choose a rating from 1 to 5");
    const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 300) : "";

    const order = await HubOrder.findOne({ _id: params.id, firebaseUid: user.uid }).select("vendorId status");
    if (!order) return fail("Order not found", 404);
    if (order.status !== "delivered") return fail("You can rate an order once it's delivered", 409);

    try {
      await HubReview.create({
        orderId: order._id,
        vendorId: order.vendorId,
        firebaseUid: user.uid,
        rating,
        comment: comment || undefined,
      });
    } catch (e) {
      if ((e as { code?: number } | null)?.code === 11000) return fail("You've already rated this order", 409);
      throw e;
    }

    // Recalculate the vendor's average from every review.
    const [agg] = await HubReview.aggregate<{ avg: number; n: number }>([
      { $match: { vendorId: order.vendorId } },
      { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } },
    ]);
    if (agg) {
      await HubVendor.updateOne(
        { _id: order.vendorId },
        { $set: { rating: Math.round(agg.avg * 10) / 10, reviewCount: agg.n } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}