import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import HubOrder from "@/models/HubOrder";
import { getClientByUid } from "@/lib/hub/getClient";
import { newReference } from "@/lib/hub/orders";
import { initializeTransaction } from "@/lib/paystack";
import { DELIVERY_FEE_KOBO } from "@/lib/hub/config";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/** Create an order (prices come from the DB, never from the browser) and start Paystack. */
export async function POST(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    const body = await req.json().catch(() => null);
    if (!body) return fail("Invalid request body");

    // ---- validate + merge cart lines
    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
    const wanted = new Map<string, number>();
    for (const it of rawItems as { productId?: unknown; quantity?: unknown }[]) {
      const id = String(it?.productId ?? "");
      const qty = Number(it?.quantity);
      if (!mongoose.isValidObjectId(id) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
        return fail("Invalid cart item");
      }
      wanted.set(id, (wanted.get(id) ?? 0) + qty);
    }
    if (wanted.size === 0 || wanted.size > 50) return fail("Your cart is empty");

    const address = String(body.delivery?.address ?? "").trim();
    const phone = String(body.delivery?.phone ?? "").trim();
    const note = String(body.delivery?.note ?? "").trim().slice(0, 300);
    if (address.length < 5 || address.length > 300) return fail("Enter a valid delivery address");
    if (phone.replace(/\D/g, "").length < 7) return fail("Enter a valid phone number");

    await connectToDatabase();
    const client = await getClientByUid(user.uid);
    if (!client) return fail("Client profile not found", 404);

    // ---- load products + enforce rules
    const products = await HubProduct.find({
      _id: { $in: [...wanted.keys()] },
      isActive: true,
      isAvailable: true,
    }).lean();
    if (products.length !== wanted.size) return fail("Some items are no longer available", 409);

    if (new Set(products.map((p) => String(p.vendorId))).size !== 1) {
      return fail("One order can only contain items from one vendor");
    }
    const vendor = await HubVendor.findOne({ _id: products[0].vendorId, isActive: true, isOpen: true }).lean();
    if (!vendor) return fail("This vendor is currently closed", 409);

    let subtotalKobo = 0;
    const items = products.map((p) => {
      const quantity = wanted.get(String(p._id))!;
      if (typeof p.stock === "number" && p.stock < quantity) {
        throw Object.assign(new Error(`${p.name}: only ${p.stock} left`), { hub: true });
      }
      subtotalKobo += p.priceKobo * quantity;
      return { productId: p._id, name: p.name, imageUrl: p.imageUrl, unitPriceKobo: p.priceKobo, quantity };
    });
    const totalKobo = subtotalKobo + DELIVERY_FEE_KOBO;

    // ---- create order, then start payment
    const orderId = new mongoose.Types.ObjectId();
    const reference = newReference(String(orderId));
    await HubOrder.create({
      _id: orderId,
      clientId: client._id,
      firebaseUid: user.uid,
      vendorId: vendor._id,
      vendorName: vendor.name,
      items,
      subtotalKobo,
      deliveryFeeKobo: DELIVERY_FEE_KOBO,
      totalKobo,
      payment: { reference, status: "pending" },
      delivery: { address, phone, note },
    });

    try {
      const init = await initializeTransaction({
        email: client.email || user.email || "",
        amountKobo: totalKobo,
        reference,
        callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/dashboard/hub/orders/${orderId}`,
        metadata: { orderId: String(orderId), source: "crafteey-hub" },
      });
      return NextResponse.json(
        { orderId: String(orderId), reference, authorizationUrl: init.authorization_url },
        { status: 201 }
      );
    } catch (e) {
      console.error("[hub] paystack init failed", e);
      await HubOrder.deleteOne({ _id: orderId });
      return fail("Could not start payment. Please try again.", 502);
    }
  } catch (e) {
    if (e instanceof Error && (e as Error & { hub?: boolean }).hub) return fail(e.message, 409);
    return handleError(e);
  }
}

/** My orders, newest first. */
export async function GET(req: NextRequest) {
  try {
    const user = await verifyToken(req);
    await connectToDatabase();
    const orders = await HubOrder.find({ firebaseUid: user.uid }).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ orders });
  } catch (e) {
    return handleError(e);
  }
}