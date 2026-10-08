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
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      vendor: {
        _id: String(v._id),
        name: v.name,
        bannerUrl: v.bannerUrl ?? null,
        tagline: v.tagline ?? null,
        description: v.description ?? null,
        address: v.address ?? null,
        isOpen: v.isOpen,
        openTime: v.openTime ?? null,
        closeTime: v.closeTime ?? null,
        rating: v.rating ?? null,
        reviewCount: v.reviewCount ?? 0,
      },
      products: products.map((p) => ({
        _id: String(p._id),
        name: p.name,
        description: p.description ?? null,
        priceKobo: p.priceKobo,
        imageUrl: p.imageUrl ?? null,
        emoji: p.emoji ?? null,
        unit: p.unit ?? null,
        menuSection: p.menuSection ?? null,
        available: p.isAvailable && (p.stock == null || p.stock > 0),
        optionGroups: (p.optionGroups ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          required: !!g.required,
          single: !!g.single,
          choices: (g.choices ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            priceKobo: c.priceKobo,
            imageUrl: c.imageUrl ?? undefined,
            maxQty: c.maxQty ?? 1,
          })),
        })),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}