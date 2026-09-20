import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import Client from "@/models/Client";
import { COURIER_STATUS } from "@/lib/constants";

const VALID_VEHICLE_TYPES = ["bicycle", "motorcycle", "cargo"] as const;
type VehicleType = (typeof VALID_VEHICLE_TYPES)[number];

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
    const {
      pickup,
      dropoff,
      note,
      pickupContactName,
      pickupContactPhone,
      receiverName,
      receiverPhone,
      vehicleType,
    } = body as {
      pickup?: string;
      dropoff?: string;
      note?: string;
      pickupContactName?: string;
      pickupContactPhone?: string;
      receiverName?: string;
      receiverPhone?: string;
      vehicleType?: string;
    };

    if (!pickup) {
      return NextResponse.json({ error: "pickup is required" }, { status: 400 });
    }
    if (!dropoff) {
      return NextResponse.json({ error: "dropoff is required" }, { status: 400 });
    }
    if (!receiverName) {
      return NextResponse.json({ error: "receiverName is required" }, { status: 400 });
    }
    if (!receiverPhone) {
      return NextResponse.json({ error: "receiverPhone is required" }, { status: 400 });
    }
    if (!vehicleType || !VALID_VEHICLE_TYPES.includes(vehicleType as VehicleType)) {
      return NextResponse.json(
        { error: "vehicleType must be one of: bicycle, motorcycle, cargo" },
        { status: 400 }
      );
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
      pickupContactName: pickupContactName || client.name,
      pickupContactPhone: pickupContactPhone || client.phone,
      receiverName,
      receiverPhone,
      vehicleType,
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