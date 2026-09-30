import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubVendor from "@/models/HubVendor";
import HubProduct from "@/models/HubProduct";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.isValidObjectId(params.id)) return fail("Invalid vendor id");
    await connectToDatabase();

    const v = await HubVendor.findOne({ _id: params.id, isActive: true }).lean();
    if (!v) return fail("Vendor not found", 404);

    const products = await HubProduct.find({ vendorId: params.id, isActive: true })
      .sort({ category: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      vendor: {
        _id: String(v._id),
        name: v.name,
        logoUrl: v.logoUrl ?? null,
        emoji: v.emoji ?? null,
        tagline: v.tagline ?? null,
        description: v.description ?? null,
        address: v.address ?? null,
        isOpen: v.isOpen,
        openTime: v.openTime ?? null,
        closeTime: v.closeTime ?? null,
        rating: v.rating ?? null,
        reviewCount: v.reviewCount ?? 0,
        etaMin: v.etaMin ?? null,
        etaMax: v.etaMax ?? null,
      },
      products: products.map((p) => ({
        _id: String(p._id),
        name: p.name,
        description: p.description ?? null,
        priceKobo: p.priceKobo,
        imageUrl: p.imageUrl ?? null,
        emoji: p.emoji ?? null,
        unit: p.unit ?? null,
        category: p.category,
        available: p.isAvailable && (p.stock == null || p.stock > 0),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}