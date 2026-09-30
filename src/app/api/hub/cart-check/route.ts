import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

// Live state of the items in a cart: current price, availability, and whether
// the store is open. Items missing from the response no longer exist.
export async function POST(req: NextRequest) {
  try {
    await verifyToken(req);
    await connectToDatabase();

    const body = await req.json().catch(() => null);
    const ids: unknown[] = Array.isArray(body?.productIds) ? body.productIds : [];
    if (
      ids.length === 0 ||
      ids.length > 50 ||
      ids.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id))
    ) {
      return fail("Invalid cart");
    }

    const products = await HubProduct.find({ _id: { $in: ids }, isActive: true })
      .select("name priceKobo isAvailable stock vendorId")
      .lean();

    const vendorId = products[0]?.vendorId;
    const vendor = vendorId
      ? await HubVendor.findOne({ _id: vendorId, isActive: true }).select("name isOpen").lean()
      : null;

    return NextResponse.json({
      vendor: vendor ? { _id: String(vendor._id), name: vendor.name, isOpen: vendor.isOpen } : null,
      items: products.map((p) => ({
        productId: String(p._id),
        name: p.name,
        priceKobo: p.priceKobo,
        isAvailable: p.isAvailable,
        stock: typeof p.stock === "number" ? p.stock : null,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}