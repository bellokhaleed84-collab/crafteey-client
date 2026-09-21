import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid product id");
    await connectToDatabase();

    const p = await HubProduct.findOne({ _id: params.id, isActive: true }).lean();
    if (!p) return fail("Product not found", 404);
    const v = await HubVendor.findOne({ _id: p.vendorId, isActive: true }).select("name logoUrl isOpen").lean();
    if (!v) return fail("Product not found", 404);

    return NextResponse.json({
      product: {
        ...p,
        _id: String(p._id),
        vendorId: String(p.vendorId),
        isAvailable: p.isAvailable && (p.stock == null || p.stock > 0),
        vendor: { _id: String(v._id), name: v.name, logoUrl: v.logoUrl, isOpen: v.isOpen },
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
