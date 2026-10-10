import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import Review from "@/models/Review";
import { COURIER_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const COMMENT_MAX = 300;

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

type RequestLite = { status: string; courierUid?: string | null; courierName?: string | null; clientName?: string };

/** GET: has this delivery been rated, and can it be rated now? */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Delivery not found", 404);
    await connectToDatabase();

    const request = await CourierRequest.findOne({ _id: params.id, clientUid: uid })
      .select("status courierUid courierName")
      .lean<RequestLite>();
    if (!request) return fail("Delivery not found", 404);

    const review = await Review.findOne({
      sourceType: "courier_request",
      sourceId: params.id,
      targetType: "rider",
    })
      .select("rating comment")
      .lean();

    return NextResponse.json({
      riderName: request.courierName ?? null,
      canRate: request.status === COURIER_STATUS.DELIVERED && !!request.courierUid,
      review: review ? { rating: review.rating, comment: review.comment ?? "" } : null,
    });
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);
    console.error("GET /api/courier-requests/[id]/rate failed:", err);
    return fail("Server error", 500);
  }
}

/** POST { rating, comment? }: the customer rates the rider of a delivered request. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Delivery not found", 404);

    const body = (await req.json().catch(() => ({}))) as { rating?: unknown; comment?: unknown };
    const rating = Number(body.rating);
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("Pick a rating from 1 to 5 stars.");
    if (comment.length > COMMENT_MAX) return fail(`Keep your comment under ${COMMENT_MAX} characters.`);

    await connectToDatabase();

    // Only the customer who booked it can rate, and only once it is delivered.
    const request = await CourierRequest.findOne({ _id: params.id, clientUid: uid })
      .select("status courierUid courierName clientName")
      .lean<RequestLite>();
    if (!request) return fail("Delivery not found", 404);
    if (request.status !== COURIER_STATUS.DELIVERED || !request.courierUid) {
      return fail("You can rate your rider once the delivery is finished.", 409);
    }

    try {
      await Review.create({
        reviewerUid: uid,
        reviewerName: request.clientName ?? "",
        targetType: "rider",
        targetId: request.courierUid,
        targetName: request.courierName ?? "",
        sourceType: "courier_request",
        sourceId: params.id,
        rating,
        comment,
      });
    } catch (e) {
      if ((e as { code?: number } | null)?.code === 11000) return fail("You've already rated this delivery.", 409);
      throw e;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return fail(err.message, err.status);
    console.error("POST /api/courier-requests/[id]/rate failed:", err);
    return fail("Server error", 500);
  }
}