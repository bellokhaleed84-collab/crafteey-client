import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import Client from "@/models/Client";
import { COURIER_STATUS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const client = await Client.findOne({ firebaseUid: uid });
    if (!client) {
      return NextResponse.json(
        { error: "Complete your client profile before requesting a courier" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { pickup, dropoff, note } = body as {
      pickup?: string;
      dropoff?: string;
      note?: string;
    };

    if (!pickup) {
      return NextResponse.json({ error: "pickup is required" }, { status: 400 });
    }
    if (!dropoff) {
      return NextResponse.json({ error: "dropoff is required" }, { status: 400 });
    }

    const existingActive = await CourierRequest.findOne({
      clientUid: uid,
      status: { $nin: [COURIER_STATUS.DELIVERED, COURIER_STATUS.CANCELLED] },
    });
    if (existingActive) {
      return NextResponse.json({ error: "You already have an active request" }, { status: 409 });
    }

    const request = await CourierRequest.create({
      clientUid: uid,
      clientName: client.name,
      clientPhone: client.phone,
      pickup,
      dropoff,
      note: note ?? "",
      status: COURIER_STATUS.PENDING,
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST /api/courier-requests failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { uid } = await verifyToken(req);
    await connectToDatabase();

    const requests = await CourierRequest.find({ clientUid: uid }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ requests });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET /api/courier-requests failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}