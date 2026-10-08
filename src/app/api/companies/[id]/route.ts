import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/middleware/auth";
import Company from "@/models/Company";
import Review from "@/models/Review";
import { fail, handleError } from "@/lib/hub/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/companies/[id]
 * Public profile of one approved company. No phone, email, address or documents.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await verifyToken(req);
    if (!mongoose.isValidObjectId(params.id)) return fail("Company not found", 404);
    await connectToDatabase();

    const company = await Company.findOne({ _id: params.id, status: "approved" })
      .select(
        "businessName logoUrl trades areas description priceRange rating ratingCount verified isOnline yearsOperating technicianCount photos createdAt"
      )
      .lean();

    if (!company) return fail("Company not found", 404);

    // How many 1 to 5 star reviews, for the bars.
    const rows = await Review.aggregate([
      { $match: { targetType: "company", targetId: params.id, status: "published" } },
      { $group: { _id: "$rating", n: { $sum: 1 } } },
    ]);
    const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const r of rows) distribution[String(r._id)] = r.n;

    return NextResponse.json({
      company: { ...company, photos: (company.photos ?? []).slice(0, 24) },
      distribution,
    });
  } catch (e) {
    return handleError(e);
  }
}