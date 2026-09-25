import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubVendor from "@/models/HubVendor";
import { calculateDeliveryFee } from "@/lib/pricing/calculateDeliveryFee";
import { haversineKm, estimateMinutes } from "@/lib/pricing/distance";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const vendorId = body?.vendorId;
    const vehicleType = body?.vehicleType;
    const deliveryLat = Number(body?.deliveryLat);
    const deliveryLng = Number(body?.deliveryLng);

    if (!mongoose.isValidObjectId(vendorId)) return fail("Invalid vendorId");
    if (vehicleType !== "bicycle" && vehicleType !== "motorcycle") {
      return fail("Please choose a delivery vehicle");
    }
    if (!Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng)) {
      return fail("Invalid delivery location");
    }

    await connectToDatabase();
    const vendor = await HubVendor.findOne({ _id: vendorId, isActive: true }).select("lat lng").lean();
    if (!vendor) return fail("Vendor not found", 404);
    if (typeof vendor.lat !== "number" || typeof vendor.lng !== "number") {
      return fail("This vendor's location isn't set up yet");
    }

    const km = haversineKm({ lat: vendor.lat, lng: vendor.lng }, { lat: deliveryLat, lng: deliveryLng });
    const minutes = estimateMinutes(km, vehicleType);

    const feeResult = calculateDeliveryFee({
      vehicleType,
      riderToPickupKm: 0,
      riderToPickupMinutes: 0,
      pickupToDropoffKm: km,
      pickupToDropoffMinutes: minutes,
    });

    return NextResponse.json({
      deliveryFeeKobo: Math.round(feeResult.deliveryFee * 100),
      riderEarningKobo: Math.round(feeResult.riderEarning * 100),
      platformCommissionKobo: Math.round(feeResult.platformCommission * 100),
      distanceKm: Math.round(km * 10) / 10,
    });
  } catch (e) {
    return handleError(e);
  }
}