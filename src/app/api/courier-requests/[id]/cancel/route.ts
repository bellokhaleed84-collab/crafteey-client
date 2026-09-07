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

    // Ownership check baked into the filter: only cancel a request that
    // belongs to the calling client AND isn't already delivered/cancelled.
    // If either check fails, matchedCount is 0 and we return 404 instead
    // of silently "succeeding" on someone else's or an already-closed
    // request.
    const result = await CourierRequest.updateOne(
      {
        _id: id,
        clientUid: uid,
        status: { $nin: [COURIER_STATUS.DELIVERED, COURIER_STATUS.CANCELLED] },
      },
      { $set: { status: COURIER_STATUS.CANCELLED } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Request not found or already closed" },
        { status: 404 }
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