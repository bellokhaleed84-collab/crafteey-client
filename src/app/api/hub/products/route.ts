import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import HubProduct from "@/models/HubProduct";
import HubVendor from "@/models/HubVendor";
import { isHubCategory } from "@/lib/hub/config";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const category = sp.get("category");
    const vendorId = sp.get("vendorId");
    const q = (sp.get("q") || "").trim().slice(0, 60);
    const limit = Math.min(Math.max(parseInt(sp.get("limit") || "50", 10) || 50, 1), 100);
    const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);

    if (category && !isHubCategory(category)) return fail("Invalid category");
    if (vendorId && !mongoose.isValidObjectId(vendorId)) return fail("Invalid vendorId");

    await connectToDatabase();

    // Only show products from active vendors
    const vendors = await HubVendor.find({ isActive: true }).select("name logoUrl isOpen").lean();
    const vendorMap = new Map(vendors.map((v) => [String(v._id), v]));

    if (vendorId && !vendorMap.has(vendorId)) return NextResponse.json({ products: [], page, hasMore: false });

    const filter: Record<string, unknown> = {
      isActive: true,
      vendorId: vendorId ? vendorId : { $in: Array.from(vendorMap.keys()) },
    };
    if (category) filter.category = category; // Food -> food only, Drinks -> drinks only, etc.
    if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };

    const docs = await HubProduct.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const products = docs.map((p) => {
      const v = vendorMap.get(String(p.vendorId));
      return {
        _id: String(p._id),
        category: p.category,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        emoji: p.emoji,
        priceKobo: p.priceKobo,
        unit: p.unit,
        stock: p.stock ?? null,
        isAvailable: p.isAvailable && (p.stock == null || p.stock > 0),
        vendor: { _id: String(v?._id), name: v?.name ?? "", logoUrl: v?.logoUrl, isOpen: v?.isOpen ?? false },
      };
    });

    return NextResponse.json({ products, page, hasMore: docs.length === limit });
  } catch (e) {
    return handleError(e);
  }
}