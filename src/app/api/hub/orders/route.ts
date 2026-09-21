import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubOrder from "@/models/HubOrder";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import { getClientByUid } from "@/lib/hub/getClient";
import { newReference } from "@/lib/hub/orders";
import { initializeTransaction } from "@/lib/paystack";
import { DELIVERY_FEE_KOBO } from "@/lib/hub/config";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

type RequestedItem = { productId: string; quantity: number };

export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const items: RequestedItem[] = Array.isArray(body?.items) ? body.items : [];
    const delivery = body?.delivery ?? {};
    const address = String(delivery.address || "").trim();
    const phone = delivery.phone ? String(delivery.phone).trim() : undefined;
    const note = delivery.note ? String(delivery.note).trim() : undefined;

    if (items.length === 0) return fail("Your cart is empty");
    if (!address) return fail("Delivery address is required");
    for (const it of items) {
      if (!mongoose.isValidObjectId(it.productId)) return fail("Invalid item in cart");
      if (!Number.isInteger(it.quantity) || it.quantity < 1) return fail("Invalid quantity");
    }

    const client = await getClientByUid(user.uid);
    if (!client) return fail("Client account not found", 404);

    // Look up the real products server-side — never trust client-sent prices.
    const productIds = items.map((i) => i.productId);
    const products = await HubProduct.find({ _id: { $in: productIds }, isActive: true });

    const byId = new Map(products.map((p) => [String(p._id), p]));
    for (const it of items) {
      const p = byId.get(it.productId);
      if (!p) return fail("One of the items in your cart is no longer available");
      if (!p.isAvailable) return fail(`${p.name} is currently unavailable`);
      if (typeof p.stock === "number" && p.stock < it.quantity) {
        return fail(`Only ${p.stock} left of ${p.name}`);
      }
    }

    // All items must come from the same vendor (single-vendor cart/order).
    const vendorIds = new Set(products.map((p) => String(p.vendorId)));
    if (vendorIds.size > 1) return fail("Your cart has items from more than one vendor");

    const vendorId = products[0].vendorId;
    const vendor = await HubVendor.findOne({ _id: vendorId, isActive: true });
    if (!vendor) return fail("Vendor not found", 404);
    if (!vendor.isOpen) return fail("This vendor is currently closed");

    const orderItems = items.map((it) => {
      const p = byId.get(it.productId)!;
      return {
        productId: p._id,
        name: p.name,
        imageUrl: p.imageUrl,
        unitPriceKobo: p.priceKobo,
        quantity: it.quantity,
      };
    });

    const subtotalKobo = orderItems.reduce((sum, it) => sum + it.unitPriceKobo * it.quantity, 0);
    const deliveryFeeKobo = DELIVERY_FEE_KOBO;
    const totalKobo = subtotalKobo + deliveryFeeKobo;

    const order = await HubOrder.create({
      clientId: client._id,
      firebaseUid: user.uid,
      vendorId: vendor._id,
      vendorName: vendor.name,
      items: orderItems,
      subtotalKobo,
      deliveryFeeKobo,
      totalKobo,
      status: "pending_payment",
      payment: { status: "pending" },
      delivery: { address, phone, note },
    });

    const reference = newReference(String(order._id));
    order.payment.reference = reference;
    await order.save();

    const init = await initializeTransaction({
      email: client.email || user.email || "",
      amountKobo: totalKobo,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/hub/orders/${order._id}`,
      metadata: { orderId: String(order._id), source: "crafteey-hub" },
    });

    return NextResponse.json({
      orderId: String(order._id),
      accessCode: init.access_code,
      authorizationUrl: init.authorization_url,
      reference,
    });
  } catch (e) {
    return handleError(e);
  }
}