import { NextRequest, NextResponse } from "next/server";
import { verifyToken, AuthError } from "@/middleware/auth";
import { connectToDatabase } from "@/lib/mongodb";
import CourierRequest from "@/models/CourierRequest";
import Client from "@/models/Client";
import { COURIER_STATUS } from "@/lib/constants";
import { calculateDeliveryFee } from "@/lib/pricing/calculateDeliveryFee";
import { haversineKm, estimateMinutes } from "@/lib/pricing/distance";

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
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      note,
      pickupContactName,
      pickupContactPhone,
      receiverName,
      receiverPhone,
      vehicleType,
    } = body as {
      pickup?: string;
      dropoff?: string;
      pickupLat?: number;
      pickupLng?: number;
      dropoffLat?: number;
      dropoffLng?: number;
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

    // Fare estimate at creation time, same approach as Hub checkout:
    // pickup→dropoff distance only (no rider assigned yet, so the
    // rider-to-pickup leg is 0). Only computed when both coordinate pairs
    // are present — older callers or missing geocoding just skip pricing
    // rather than failing the whole request.
    let riderEarningKobo: number | null = null;
    const hasCoords =
      typeof pickupLat === "number" &&
      typeof pickupLng === "number" &&
      typeof dropoffLat === "number" &&
      typeof dropoffLng === "number";

    if (hasCoords) {
      const km = haversineKm({ lat: pickupLat!, lng: pickupLng! }, { lat: dropoffLat!, lng: dropoffLng! });
      const minutes = estimateMinutes(km, vehicleType);
      const feeResult = calculateDeliveryFee({
        vehicleType: vehicleType as VehicleType,
        riderToPickupKm: 0,
        riderToPickupMinutes: 0,
        pickupToDropoffKm: km,
        pickupToDropoffMinutes: minutes,
      });
      riderEarningKobo = Math.round(feeResult.riderEarning * 100);
    }

    const request = await CourierRequest.create({
      clientUid: uid,
      clientName: client.name,
      clientPhone: client.phone,
      pickup,
      dropoff,
      pickupLat: hasCoords ? pickupLat : null,
      pickupLng: hasCoords ? pickupLng : null,
      dropoffLat: hasCoords ? dropoffLat : null,
      dropoffLng: hasCoords ? dropoffLng : null,
      note: note ?? "",
      pickupContactName: pickupContactName || client.name,
      pickupContactPhone: pickupContactPhone || client.phone,
      receiverName,
      receiverPhone,
      vehicleType,
      riderEarningKobo,
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