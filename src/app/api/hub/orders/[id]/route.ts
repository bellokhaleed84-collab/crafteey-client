import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid order id");
    await connectToDatabase();

    const order = await HubOrder.findOne({ _id: params.id, firebaseUid: user.uid });
    if (!order) return fail("Order not found", 404);

    return NextResponse.json({
      order: {
        _id: String(order._id),
        vendorName: order.vendorName,
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
      },
    });
  } catch (e) {
    return handleError(e);
  }
}