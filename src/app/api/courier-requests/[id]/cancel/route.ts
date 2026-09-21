// src/app/api/courier-requests/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import { COURIER_STATUS } from "@/lib/constants";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const { id } = params;

    // A client can only cancel while the request is still PENDING (i.e.
    // "finding a courier"). The status is part of the update filter, so
    // if a courier accepts at the same instant, this update simply won't
    // match — there's no window where an accepted delivery gets cancelled.
    // Ownership (clientUid) is enforced in the same filter.
    const result = await CourierRequest.updateOne(
      {
        _id: id,
        clientUid: uid,
        status: COURIER_STATUS.PENDING,
      },
      { $set: { status: COURIER_STATUS.CANCELLED } }
    );

    if (result.matchedCount === 0) {
      // Work out *why* it didn't match, so the response is accurate
      // instead of a generic "not found".
      const existing = await CourierRequest.findOne({ _id: id, clientUid: uid })
        .select("status")
        .lean<{ status: string }>();

      if (!existing) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
      }

      if (existing.status === COURIER_STATUS.CANCELLED) {
        return NextResponse.json({ error: "Request is already cancelled" }, { status: 409 });
      }

      return NextResponse.json(
        { error: "A courier has already accepted this delivery, so it can no longer be cancelled." },
        { status: 409 }
      );
    }

    const updated = await CourierRequest.findById(id).lean();
    return NextResponse.json({ request: updated });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PATCH /api/courier-requests/[id]/cancel failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}