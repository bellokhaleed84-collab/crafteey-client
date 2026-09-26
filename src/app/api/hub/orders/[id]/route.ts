import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import HubVendor from "@/models/HubVendor";
import CourierRequest from "@/models/CourierRequest";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

// Once the order isn't just sitting at "paid", a courier request exists
// (or should) — look it up so the client can see who's assigned and
// where they are.
const COURIER_VISIBLE_STATUSES = ["preparing", "out_for_delivery", "delivered"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid order id");
    await connectToDatabase();

    const order = await HubOrder.findOne({ _id: params.id, firebaseUid: user.uid });
    if (!order) return fail("Order not found", 404);

    let courier = null;
    if (COURIER_VISIBLE_STATUSES.includes(order.status)) {
      const cr = await CourierRequest.findOne({ hubOrderId: String(order._id) }).lean();
      if (cr) {
        const vendor = await HubVendor.findById(order.vendorId).select("lat lng").lean();
        courier = {
          requestId: String(cr._id),
          status: cr.status,
          name: cr.courierName,
          phone: cr.courierPhone,
          vehicleType: cr.vehicleType,
          location: cr.courierLocation ?? null,
          pickupLat: vendor?.lat ?? cr.pickupLat ?? null,
          pickupLng: vendor?.lng ?? cr.pickupLng ?? null,
          dropoffLat: order.deliveryLat ?? null,
          dropoffLng: order.deliveryLng ?? null,
        };
      }
    }

    return NextResponse.json({
      order: {
        _id: String(order._id),
        vendorId: String(order.vendorId),
        vendorName: order.vendorName,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({
          productId: String(i.productId),
          name: i.name,
          imageUrl: i.imageUrl,
          unitPriceKobo: i.unitPriceKobo,
          quantity: i.quantity,
        })),
        subtotalKobo: order.subtotalKobo,
        deliveryFeeKobo: order.deliveryFeeKobo,
        totalKobo: order.totalKobo,
        status: order.status,
        delivery: {
          address: order.delivery.address,
          phone: order.delivery.phone,
          note: order.delivery.note,
        },
        createdAt: order.createdAt,
        courier,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}